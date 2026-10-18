"""Constantes de seguridad compartidas."""

# Hash bcrypt de la contraseña inicial del administrador sembrada por
# deployment/db/scripts/04_bootstrap.sql. Es público (está en el repositorio),
# por eso en producción se BLOQUEA el login de cualquier cuenta que aún la use.
SEED_ADMIN_PASSWORD_HASH = "$2b$12$WsoimVRQt5PwhyQstNE5puHWjiliLurOLkfGoiQz.2ZAP.ekRGyOq"
