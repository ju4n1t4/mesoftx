from datetime import timedelta

from app.core.config import get_settings
from app.infrastructure.repositories.sqlalchemy_repositories import UserRepository
from app.infrastructure.security.google_identity_service import GoogleTokenError, verify_google_id_token
from app.infrastructure.security.jwt_service import create_access_token
from app.infrastructure.security.password_service import verify_password


class InvalidCredentialsError(Exception):
    pass


class InactiveUserError(Exception):
    pass


class GoogleAuthenticationError(Exception):
    pass


class AuthService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository
        self.settings = get_settings()

    def login(self, email: str, password: str) -> str:
        user = self.user_repository.get_by_email(email)
        if not user or not user.password or not verify_password(password, user.password):
            raise InvalidCredentialsError("Invalid email or password.")
        if not user.active:
            raise InactiveUserError("User is inactive.")

        return self._create_user_token(user)

    def login_with_google(self, id_token: str) -> str:
        try:
            identity = verify_google_id_token(id_token, self.settings.google_client_id)
        except GoogleTokenError as exc:
            raise GoogleAuthenticationError(str(exc)) from exc

        user = self.user_repository.get_by_email(identity.email)
        if not user:
            raise InvalidCredentialsError("Google account is not registered in MesoftX.")
        if not user.active:
            raise InactiveUserError("User is inactive.")

        return self._create_user_token(user)

    def _create_user_token(self, user) -> str:
        expires_delta = timedelta(minutes=self.settings.jwt_access_token_expire_minutes)
        return create_access_token(
            subject=str(user.id),
            claims={"email": user.email, "role_id": user.role_id},
            expires_delta=expires_delta,
        )
