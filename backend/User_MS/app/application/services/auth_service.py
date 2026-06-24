from datetime import timedelta

from app.core.config import get_settings
from app.infrastructure.repositories.sqlalchemy_repositories import UserRepository
from app.infrastructure.security.jwt_service import create_access_token
from app.infrastructure.security.password_service import verify_password


class InvalidCredentialsError(Exception):
    pass


class InactiveUserError(Exception):
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

        expires_delta = timedelta(minutes=self.settings.jwt_access_token_expire_minutes)
        return create_access_token(
            subject=str(user.id),
            claims={"email": user.email, "role_id": user.role_id},
            expires_delta=expires_delta,
        )
