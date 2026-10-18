"""Política de contraseñas para cambios iniciados por el usuario (OWASP ASVS V2.1)."""
import re

MIN_LENGTH = 10


class PasswordPolicyError(ValueError):
    pass


def validate_new_password(password: str, *, current: str | None = None) -> None:
    if len(password) < MIN_LENGTH:
        raise PasswordPolicyError(f"Debe tener al menos {MIN_LENGTH} caracteres.")
    if len(password) > 128:
        raise PasswordPolicyError("Debe tener máximo 128 caracteres.")
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise PasswordPolicyError("Debe combinar letras y números.")
    if password.lower() in {"mesoftx2026!", "password123", "contraseña123"}:
        raise PasswordPolicyError("Es una contraseña conocida; elija otra.")
    if current is not None and password == current:
        raise PasswordPolicyError("Debe ser distinta de la actual.")
