from datetime import timedelta

from app.application.ports.repositories import UserRepositoryPort
from app.application.ports.security import (
    GoogleIdentityVerifierPort,
    GoogleTokenVerificationError,
    PasswordHasherPort,
    TokenIssuerPort,
)
from app.core.config import get_settings


class InvalidCredentialsError(Exception):
    pass


class InactiveUserError(Exception):
    pass


class GoogleAuthenticationError(Exception):
    pass


class AuthService:
    def __init__(
        self,
        user_repository: UserRepositoryPort,
        password_hasher: PasswordHasherPort,
        token_issuer: TokenIssuerPort,
        google_identity_verifier: GoogleIdentityVerifierPort,
    ):
        self.user_repository = user_repository
        self.password_hasher = password_hasher
        self.token_issuer = token_issuer
        self.google_identity_verifier = google_identity_verifier
        self.settings = get_settings()

    def login(self, email: str, password: str) -> str:
        user = self.user_repository.get_by_email(email)
        if not user or not user.password or not self.password_hasher.verify(password, user.password):
            raise InvalidCredentialsError("Invalid email or password.")
        if not user.active:
            raise InactiveUserError("User is inactive.")

        return self._create_user_token(user)

    def login_with_google(self, id_token: str) -> str:
        try:
            identity = self.google_identity_verifier.verify(id_token)
        except GoogleTokenVerificationError as exc:
            raise GoogleAuthenticationError(str(exc)) from exc

        user = self.user_repository.get_by_email(identity.email)
        if not user:
            raise InvalidCredentialsError("Google account is not registered in MesoftX.")
        if not user.active:
            raise InactiveUserError("User is inactive.")

        return self._create_user_token(user)

    def _create_user_token(self, user) -> str:
        expires_delta = timedelta(minutes=self.settings.jwt_access_token_expire_minutes)
        return self.token_issuer.create_access_token(
            subject=str(user.id),
            claims={"email": user.email, "role_id": user.role_id},
            expires_delta=expires_delta,
        )
