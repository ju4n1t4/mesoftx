"""Cuentas de demostración (solo usables cuando DEMO_MODE=true). Sin contraseñas conocidas."""

DEMO_EMAIL_DOMAIN = "demo.mesoftx.local"

# clave pública -> (rol, nombre visible). El rol "Administrativo" lo crea 04_bootstrap.sql;
# los demás los crea `python -m app.tools.seed_demo` si no existen.
DEMO_ROLES = {
    "administrativo": "Administrativo",
    "coordinador": "Coordinador",
    "profesor": "Profesor",
    "auditor": "Auditor",
}


def demo_email(key: str) -> str:
    return f"demo.{key}@{DEMO_EMAIL_DOMAIN}"


def is_demo_email(email: str | None) -> bool:
    return bool(email) and email.strip().lower().endswith("@" + DEMO_EMAIL_DOMAIN)
