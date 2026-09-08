from datetime import timedelta
from typing import Any, Protocol


class GoogleTokenVerificationError(Exception):
    pass


class PasswordHasherPort(Protocol):
    def hash(self, password: str) -> str:
        ...

    def verify(self, plain_password: str, hashed_password: str) -> bool:
        ...


class TokenIssuerPort(Protocol):
    def create_access_token(
        self,
        subject: str,
        claims: dict[str, Any] | None = None,
        expires_delta: timedelta | None = None,
    ) -> str:
        ...


class GoogleIdentityVerifierPort(Protocol):
    def verify(self, id_token: str) -> Any:
        ...
