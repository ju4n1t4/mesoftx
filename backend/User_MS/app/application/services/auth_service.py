import logging
from datetime import timedelta

from app.core.demo_accounts import DEMO_ROLES, demo_email, is_demo_email
from app.core.security_constants import SEED_ADMIN_PASSWORD_HASH
from app.application.ports.repositories import UserRepository
from app.application.ports.security import PasswordVerifier, TokenIssuer


class InvalidCredentialsError(Exception):
    pass


class InactiveUserError(Exception):
    pass


class DemoUnavailableError(Exception):
    """Modo exposición apagado o perfil de demostración inexistente."""


class DefaultPasswordError(Exception):
    """La cuenta aún usa la contraseña inicial publicada en el repositorio."""


audit = logging.getLogger("mesoftx.audit")


class AuthService:
    def __init__(self, user_repository: UserRepository, settings, verify_password: PasswordVerifier, issue_token: TokenIssuer):
        self.user_repository = user_repository
        self.settings = settings
        self.verify_password = verify_password
        self.issue_token = issue_token

    def login(self, email: str, password: str) -> str:
        if is_demo_email(email):
            # Las cuentas de demostración nunca entran por contraseña.
            raise InvalidCredentialsError("Invalid email or password.")
        user = self.user_repository.get_by_email(email)
        if not user or not user.password or not self.verify_password(password, user.password):
            raise InvalidCredentialsError("Invalid email or password.")
        if not user.active:
            raise InactiveUserError("User is inactive.")
        if self.settings.is_production and user.password == SEED_ADMIN_PASSWORD_HASH:
            audit.critical("LOGIN_BLOCKED user=%s motivo=contraseña inicial sin rotar", user.id)
            raise DefaultPasswordError(
                "La contraseña inicial debe cambiarse antes de usar el sistema en producción. "
                "Ejecute: docker compose exec user-ms python -m app.tools.set_password <correo>"
            )

        return self._issue_token(user)

    def demo_login(self, role_key: str) -> str:
        """Token real para la cuenta de demostración del perfil pedido (solo con DEMO_MODE=true)."""
        if not self.settings.demo_mode or role_key not in DEMO_ROLES:
            raise DemoUnavailableError("Modo exposición no disponible.")
        user = self.user_repository.get_by_email(demo_email(role_key))
        if not user or not user.active or user.role.name != DEMO_ROLES[role_key]:
            raise DemoUnavailableError("Perfil de demostración no disponible.")
        return self._issue_token(user)

    def available_demo_roles(self) -> list[str]:
        if not self.settings.demo_mode:
            return []
        out = []
        for key, role_name in DEMO_ROLES.items():
            u = self.user_repository.get_by_email(demo_email(key))
            if u and u.active and u.role.name == role_name:
                out.append(key)
        return out

    def _issue_token(self, user) -> str:
        permissions = [rp.permission.code for rp in user.role.role_permissions]
        expires_delta = timedelta(minutes=self.settings.jwt_access_token_expire_minutes)
        return self.issue_token(
            subject=str(user.id),
            claims={
                "email": user.email,
                "role_id": user.role_id,
                "role": user.role.name,
                "program_id": user.program_id,   # None salvo Profesor; lo usa el alcance
                "perms": permissions,
            },
            expires_delta=expires_delta,
        )
