from cryptography.fernet import Fernet, MultiFernet, InvalidToken

from app.application.ports.errors import ApplicationError

class FernetSecretVault:
    def __init__(self, key: str, previous_keys: list[str] | None = None):
        self.key = key
        self.previous_keys = previous_keys or []

    def _cipher(self) -> MultiFernet:
        try:
            return MultiFernet([Fernet(value.encode('ascii')) for value in [self.key, *self.previous_keys]])
        except (ValueError, UnicodeError) as exc:
            raise ApplicationError('configuration', 'Configure a valid external encryption key before storing credentials.') from exc

    def encrypt(self, value: str) -> str:
        return self._cipher().encrypt(value.encode('utf-8')).decode('ascii')

    def decrypt(self, value: str) -> str:
        try:
            return self._cipher().decrypt(value.encode('ascii')).decode('utf-8')
        except (InvalidToken, UnicodeError) as exc:
            raise ApplicationError('configuration', 'The configured encryption key cannot decrypt this credential.') from exc
