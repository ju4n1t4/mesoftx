"""
Pruebas de seguridad de Assesment_MS (no requieren base de datos).
Verifican que TODOS los endpoints exigen autenticación (hallazgo de la memoria
4.3.2: "falta de autenticación transversal en Assesment_MS"), que el RBAC se aplica
y que el JWT se valida con emisor y audiencia.
"""
import jwt as pyjwt
import pytest
from fastapi.testclient import TestClient


import pytest
from fastapi.routing import APIRoute


def all_routes(app):
    return [r for r in app.routes if isinstance(r, APIRoute)]


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


def any_permissions_of(route):
    """Códigos aceptados por una ruta protegida con require_any_permission, o ()."""
    for sub in walk(route.dependant):
        call = sub.call
        if call is not None and "require_any_permission" in getattr(call, "__qualname__", ""):
            for cell in call.__closure__ or ():
                if isinstance(cell.cell_contents, tuple):
                    return cell.cell_contents
    return ()


def requires_service_token(route):
    return any("require_service_token" in getattr(s.call, "__qualname__", "") for s in walk(route.dependant))

from app.core.config import get_settings
from app.infrastructure.security.jwt_service import InvalidTokenError, decode_access_token
from app.interfaces.api.v1 import dependencies as deps
from app.main import app

client = TestClient(app, raise_server_exceptions=False)
PUBLIC = {"/health", "/api/v1/public/indicators"}   # únicos endpoints sin JWT


def _token(**over):
    s = get_settings()
    claims = {"sub": "5", "role_id": 3, "email": "p@unab.edu.co", "role": "Profesor", "perms": [],
              "iss": s.jwt_issuer, "aud": s.jwt_audience, "exp": 4102444800}
    claims.update(over)
    return pyjwt.encode(claims, s.jwt_secret_key, algorithm="HS256")


def test_todos_los_endpoints_exigen_autenticacion():
    fallos = []
    for r in all_routes(app):
        if r.path in PUBLIC:
            continue
        for method in r.methods - {"HEAD", "OPTIONS"}:
            resp = client.request(method, concrete_path(r))
            if resp.status_code != 401:
                fallos.append((method, r.path, resp.status_code))
    assert not fallos, f"Endpoints accesibles sin autenticar: {fallos}"


def test_endpoints_internos_exigen_token_de_servicio_y_no_jwt_de_usuario():
    internos = [r for r in all_routes(app) if requires_service_token(r)]
    for r in internos:
        for method in r.methods - {"HEAD", "OPTIONS"}:
            resp = client.request(method, concrete_path(r), headers={"Authorization": f"Bearer {_token()}"})
            assert resp.status_code == 401, (method, r.path, resp.status_code)


def test_rbac_sin_permiso_devuelve_403():
    protegidas = [(r, permission_of(r)) for r in all_routes(app) if permission_of(r)]
    assert len(protegidas) >= 15
    headers = {"Authorization": f"Bearer {_token(perms=[])}"}
    fallos = []
    for r, code in protegidas:
        for method in r.methods - {"HEAD", "OPTIONS"}:
            resp = client.request(method, concrete_path(r), headers=headers)
            if resp.status_code != 403 or code not in resp.text:
                fallos.append((method, r.path, code, resp.status_code))
    assert not fallos, f"Rutas que no aplican el permiso: {fallos}"


def test_rbac_cualquiera_de_los_permisos():
    rutas = [(r, any_permissions_of(r)) for r in all_routes(app) if any_permissions_of(r)]
    assert rutas, "GET /so debe usar require_any_permission"
    for r, codes in rutas:
        assert "GET" in r.methods and "SO_CRUD" in codes
        assert not any(c.endswith("_CRUD") and c != "SO_CRUD" for c in codes)
        sin = client.get(concrete_path(r), headers={"Authorization": f"Bearer {_token(perms=[])}"})
        assert sin.status_code == 403
        otro = client.get(concrete_path(r), headers={"Authorization": f"Bearer {_token(perms=['DASHBOARD_PROGRAM'])}"})
        assert otro.status_code == 403
        con = client.get(concrete_path(r), headers={"Authorization": f"Bearer {_token(perms=[codes[1]])}"})
        assert con.status_code != 403


def test_jwt_valido_se_acepta_y_manipulado_se_rechaza():
    assert decode_access_token(_token())["sub"] == "5"
    s = get_settings()
    for bad in (_token(iss="otro"), _token(aud="otro"), _token(exp=1),
                pyjwt.encode({"sub": "1"}, "x" * 40, algorithm="HS256")):
        with pytest.raises(InvalidTokenError):
            decode_access_token(bad)


def test_cabeceras_de_seguridad_y_docs_cerrados_en_produccion():
    h = client.get("/health").headers
    assert h["x-content-type-options"] == "nosniff" and h["x-frame-options"] == "DENY"
    from app.core.config import Settings
    prod = Settings(_env_file=None, database_url="postgresql://x", jwt_secret_key="k" * 40,
                    service_token="t" * 40, app_env="production")
    assert prod.docs_enabled is False


# ---------- Vista pública: solo agregados ----------
def test_unico_endpoint_publico_es_get_y_solo_agregados():
    publicas = [r for r in all_routes(app) if "/public" in r.path]
    assert [(r.path, sorted(r.methods)) for r in publicas] == [("/api/v1/public/indicators", ["GET"])]


def test_respuesta_publica_no_contiene_campos_personales():
    from app.interfaces.api.v1.schemas import PublicIndicatorsResponse, PublicSoIndicator, PublicLevelItem
    campos = set(PublicIndicatorsResponse.model_fields) | set(PublicSoIndicator.model_fields) | set(PublicLevelItem.model_fields)
    prohibidos = {"student_id", "students_id", "evaluator_user_id", "user_id", "nrc", "subjects_id", "email", "name", "document_number", "evidence_id"}
    assert not (campos & prohibidos)


def test_supresion_de_grupos_pequenos():
    from app.interfaces.api.v1.public import build_public_response
    r = build_public_response(
        outcomes=[("SO.1", "Uno"), ("SO.2", "Dos"), ("SO.3", "Tres")],
        counts=[("SO.1", 4, 6), ("SO.1", 3, 4), ("SO.2", 1, 3)],
        students_by_so={"SO.1": 10, "SO.2": 2},     # SO.2 tiene solo 2 estudiantes
        min_group_size=5,
    )
    so1, so2, so3 = r.items
    assert so1.suppressed is False and [l.pct for l in so1.levels] == [60, 40, 0, 0]
    assert so2.suppressed is True and so2.levels == [] and so2.students == 0 and so2.assessments == 0
    assert so3.suppressed is False and so3.levels == [] and so3.assessments == 0
    assert r.total_assessments == 10 and r.average_pct == 90      # (100*6 + 75*4)/10


def test_endpoint_publico_limita_peticiones_por_ip(monkeypatch):
    from app.infrastructure.repositories import sqlalchemy_repositories as repos
    from app.infrastructure.security.public_rate_limiter import PublicRateLimiter
    from app.infrastructure.security import public_rate_limiter as rl

    monkeypatch.setattr(repos.DashboardRepository, "all_outcomes", lambda self: [])
    monkeypatch.setattr(repos.DashboardRepository, "public_level_counts", lambda self: [])
    monkeypatch.setattr(repos.DashboardRepository, "public_students_by_so", lambda self: {})
    monkeypatch.setattr(rl, "_limiter", PublicRateLimiter(per_minute=3))
    app.dependency_overrides[deps.db_session] = lambda: object()
    try:
        codigos = [client.get("/api/v1/public/indicators").status_code for _ in range(5)]
        assert codigos == [200, 200, 200, 429, 429]
        ok = client.get("/api/v1/public/indicators")
        assert ok.headers.get("retry-after") == "60"
    finally:
        app.dependency_overrides.clear()
        monkeypatch.setattr(rl, "_limiter", None)
