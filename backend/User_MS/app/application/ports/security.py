from typing import Any, Protocol

class PasswordHasher(Protocol):
    def __call__(self, password: str) -> str: ...

class PasswordVerifier(Protocol):
    def __call__(self, password: str, password_hash: str) -> bool: ...

class TokenIssuer(Protocol):
    def __call__(self, subject: str, claims: dict[str, Any], expires_delta: Any) -> str: ...
