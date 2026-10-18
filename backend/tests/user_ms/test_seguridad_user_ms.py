"""
Pruebas de seguridad de User_MS (no requieren base de datos).
Cubren: autenticación en todos los endpoints, RBAC por permiso, JWT, límite de
intentos de login, cabeceras HTTP, documentación cerrada en producción y política
de contraseñas. Trazan a ASVS V2, V3, V4, V14 y OWASP A01/A02/A05/A07.
"""
from datetime import timedelta

import jwt as pyjwt
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError


import pytest
from fastapi.routing import APIRoute


def all_routes(app):
    """Rutas finales con su path completo. Compatible con FastAPI que guarda los routers
    incluidos de forma perezosa (>= 0.14x: `_IncludedRouter`) y con las versiones previas."""
    from types import SimpleNamespace

    out = []

    def collect(routes, prefix=""):
        for r in routes:
            if isinstance(r, APIRoute):
                out.append(SimpleNamespace(path=prefix + r.path, methods=r.methods, dependant=r.dependant))
            elif hasattr(r, "original_router") and hasattr(r, "include_context"):
                collect(r.original_router.routes, prefix + (r.include_context.prefix or ""))

    collect(app.routes)
    return out


def concrete_path(route):
    """Reemplaza {param} por un valor cualquiera para poder invocar la ruta."""
    import re
    return re.sub(r"\{[^}]+\}", "1", route.path)


def walk(dep):
    for sub in dep.dependencies:
        yield sub
        yield from walk(sub)


def permission_of(route):
    """Devuelve el código de permiso que exige la ruta (closure de require_permission) o None."""
    for sub in walk(route.dependant):
        call = sub.call
        if call is not None and "require_permission" in getattr(call, "__qualname__", ""):
            for cell in call.__closure__ or ():
                if isinstance(cell.cell_contents, str):
                    return cell.cell_contents
    return None


def requires_service_token(route):
    return any("require_service_token" in getattr(s.call, "__qualname__", "") for s in walk(route.dependant))

from app.application.services.password_policy import PasswordPolicyError, validate_new_password
from app.core.config import Settings
from app.infrastructure.security.jwt_service import InvalidTokenError, create_access_token, decode_access_token
from app.infrastructure.security.login_rate_limiter import LoginRateLimiter
from app.interfaces.api.v1 import dependencies as deps
from app.main import app

PUBLIC = {"/health", "/api/v1/auth/login"}
client = TestClient(app, raise_server_exceptions=False)


def test_todos_los_endpoints_exigen_autenticacion():
    """Cualquier ruta distinta de /health y /auth/login responde 401 sin credenciales."""
    fallos = []
    for r in all_routes(app):
        if r.path in PUBLIC:
            continue
        for method in r.methods - {"HEAD", "OPTIONS"}:
            resp = client.request(method, concrete_path(r))
            if resp.status_code != 401:
                fallos.append((method, r.path, resp.status_code))
    assert not fallos, f"Endpoints accesibles sin autenticar: {fallos}"


def test_rbac_sin_permiso_devuelve_403():
    """Un usuario autenticado SIN el permiso requerido recibe 403 en cada ruta protegida."""
    class SinPermisos:
        id = 1
        permissions: list = []
        program_id = None
        password = None

    app.dependency_overrides[deps.get_current_user] = lambda: SinPermisos()
    try:
        protegidas = [(r, permission_of(r)) for r in all_routes(app) if permission_of(r)]
        assert len(protegidas) >= 20, "Se esperaban rutas protegidas por permiso"
        fallos = []
        for r, code in protegidas:
            for method in r.methods - {"HEAD", "OPTIONS"}:
                resp = client.request(method, concrete_path(r))
                if resp.status_code != 403 or code not in resp.text:
                    fallos.append((method, r.path, code, resp.status_code))
        assert not fallos, f"Rutas que no aplican el permiso: {fallos}"
    finally:
        app.dependency_overrides.clear()


def test_login_es_la_unica_ruta_publica_de_negocio():
    rutas = {r.path for r in all_routes(app)}
    assert not any("/public" in p for p in rutas), "No debe existir el router público temporal"


# ---------- JWT ----------
def test_jwt_incluye_iss_aud_jti_exp():
    token = create_access_token("7", {"role": "Profesor", "perms": ["X"]})
    data = decode_access_token(token)
    assert data["sub"] == "7" and data["iss"] and data["aud"] and data["jti"] and data["exp"]


def test_jwt_rechaza_audiencia_o_emisor_incorrectos():
    from app.core.config import get_settings
    s = get_settings()
    base = {"sub": "1", "exp": 4102444800}
    for extra in ({"iss": "otro", "aud": s.jwt_audience}, {"iss": s.jwt_issuer, "aud": "otro"}, {}):
        tok = pyjwt.encode({**base, **extra}, s.jwt_secret_key, algorithm="HS256")
        with pytest.raises(InvalidTokenError):
            decode_access_token(tok)


def test_jwt_rechaza_expirado_firma_falsa_y_alg_none():
    from app.core.config import get_settings
    s = get_settings()
    expirado = create_access_token("1", expires_delta=timedelta(seconds=-5))
    with pytest.raises(InvalidTokenError):
        decode_access_token(expirado)
    falso = pyjwt.encode({"sub": "1", "iss": s.jwt_issuer, "aud": s.jwt_audience, "exp": 4102444800}, "x" * 40, algorithm="HS256")
    with pytest.raises(InvalidTokenError):
        decode_access_token(falso)
    sin_firma = pyjwt.encode({"sub": "1", "iss": s.jwt_issuer, "aud": s.jwt_audience, "exp": 4102444800}, None, algorithm="none")
    with pytest.raises(InvalidTokenError):
        decode_access_token(sin_firma)


def test_cada_token_tiene_jti_unico():
    assert decode_access_token(create_access_token("1"))["jti"] != decode_access_token(create_access_token("1"))["jti"]


# ---------- Límite de intentos ----------
def test_limitador_bloquea_y_se_libera_con_exito():
    lim = LoginRateLimiter(max_per_email=3, max_per_ip=10, window_seconds=60)
    for _ in range(3):
        assert lim.retry_after("a@x.co", "1.1.1.1") == 0
        lim.register_failure("a@x.co", "1.1.1.1")
    assert lim.retry_after("a@x.co", "1.1.1.1") > 0
    assert lim.retry_after("b@x.co", "2.2.2.2") == 0     # otro correo/IP no se afecta
    lim.register_success("a@x.co")
    assert lim.retry_after("a@x.co", "3.3.3.3") == 0


def test_login_devuelve_429_tras_intentos_fallidos(monkeypatch):
    from app.infrastructure.repositories import sqlalchemy_repositories as repos
    from app.infrastructure.security import login_rate_limiter as rl

    monkeypatch.setattr(repos.UserRepository, "get_by_email", lambda self, email: None)
    app.dependency_overrides[deps.db_session] = lambda: object()
    rl.get_login_rate_limiter().reset()
    try:
        codigos = [client.post("/api/v1/auth/login", json={"email": "x@unab.edu.co", "password": "mala"}).status_code for _ in range(7)]
        assert codigos[:5] == [401] * 5
        assert codigos[5] == 429
        resp = client.post("/api/v1/auth/login", json={"email": "x@unab.edu.co", "password": "mala"})
        assert "retry-after" in {k.lower() for k in resp.headers}
    finally:
        app.dependency_overrides.clear()
        rl.get_login_rate_limiter().reset()


def test_login_no_revela_si_el_usuario_existe(monkeypatch):
    from app.infrastructure.repositories import sqlalchemy_repositories as repos
    from app.infrastructure.security import login_rate_limiter as rl
    monkeypatch.setattr(repos.UserRepository, "get_by_email", lambda self, email: None)
    app.dependency_overrides[deps.db_session] = lambda: object()
    rl.get_login_rate_limiter().reset()
    try:
        r = client.post("/api/v1/auth/login", json={"email": "no.existe@unab.edu.co", "password": "x"})
        assert r.status_code == 401 and r.json()["detail"] == "Invalid email or password."
    finally:
        app.dependency_overrides.clear()
        rl.get_login_rate_limiter().reset()


# ---------- Cabeceras y configuración ----------
def test_cabeceras_de_seguridad():
    h = client.get("/health").headers
    assert h["x-content-type-options"] == "nosniff"
    assert h["x-frame-options"] == "DENY"
    assert h["referrer-policy"] == "no-referrer"
    assert "frame-ancestors 'none'" in h["content-security-policy"]
    assert h["cache-control"] == "no-store"


def _settings(**kw):
    base = dict(database_url="postgresql://x", jwt_secret_key="k" * 40, service_token="t" * 40)
    return Settings(_env_file=None, **{**base, **kw})


def test_produccion_cierra_documentacion_y_local_la_abre():
    assert _settings(app_env="production").docs_enabled is False
    assert _settings(app_env="local").docs_enabled is True
    assert _settings(app_env="production", enable_docs=True).docs_enabled is True


def test_produccion_rechaza_secretos_de_ejemplo():
    with pytest.raises(ValidationError):
        _settings(app_env="production", jwt_secret_key="change-this-jwt-secret-with-at-least-32-chars")
    with pytest.raises(ValidationError):
        _settings(app_env="production", service_token="genera-un-token-largo-aleatorio-y-no-lo-subas")
    _settings(app_env="production")   # secretos largos y aleatorios: OK


# ---------- Contraseñas ----------
@pytest.mark.parametrize("pwd", ["corta1", "sololetrasxxxx", "12345678901", "Mesoftx2026!"])
def test_politica_rechaza_contrasenas_debiles(pwd):
    with pytest.raises(PasswordPolicyError):
        validate_new_password(pwd)


def test_politica_acepta_contrasena_valida_y_rechaza_igual_a_la_actual():
    validate_new_password("ClaveSegura2026")
    with pytest.raises(PasswordPolicyError):
        validate_new_password("ClaveSegura2026", current="ClaveSegura2026")


def test_hash_semilla_publico_no_se_acepta_en_produccion(monkeypatch):
    from app.application.services.auth_service import AuthService, DefaultPasswordError
    from app.core.security_constants import SEED_ADMIN_PASSWORD_HASH
    from app.infrastructure.security.password_service import verify_password

    assert verify_password("Mesoftx2026!", SEED_ADMIN_PASSWORD_HASH)   # el hash publicado sí corresponde

    class U:
        id, active, role_id, email, program_id = 1, True, 1, "admin@unab.edu.co", None
        password = SEED_ADMIN_PASSWORD_HASH
        class role:
            name = "Administrativo"
            role_permissions = []

    class Repo:
        def get_by_email(self, e): return U()

    svc = AuthService(Repo())
    monkeypatch.setattr(svc.settings.__class__, "is_production", property(lambda self: True))
    with pytest.raises(DefaultPasswordError):
        svc.login("admin@unab.edu.co", "Mesoftx2026!")
