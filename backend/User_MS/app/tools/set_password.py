"""
Cambia la contraseña de una cuenta desde la línea de comandos (sin pasar por la API).

    docker compose exec user-ms python -m app.tools.set_password admin@unab.edu.co

La contraseña se pide por teclado (no queda en el historial del shell).
"""
import getpass
import sys

from app.application.services.password_policy import PasswordPolicyError, validate_new_password
from app.infrastructure.database.session import SessionLocal
from app.infrastructure.repositories.sqlalchemy_repositories import UserRepository
from app.infrastructure.security.password_service import hash_password


def main() -> int:
    if len(sys.argv) != 2:
        print("Uso: python -m app.tools.set_password <correo>")
        return 2
    email = sys.argv[1].strip().lower()
    new = getpass.getpass("Nueva contraseña: ")
    if new != getpass.getpass("Repita la contraseña: "):
        print("Las contraseñas no coinciden.")
        return 1
    try:
        validate_new_password(new)
    except PasswordPolicyError as exc:
        print(f"Contraseña rechazada: {exc}")
        return 1
    with SessionLocal() as db:
        repo = UserRepository(db)
        user = repo.get_by_email(email)
        if not user:
            print("No existe un usuario con ese correo.")
            return 1
        repo.update_user(user.id, {"password": hash_password(new)})
        db.commit()
    print("Contraseña actualizada.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
