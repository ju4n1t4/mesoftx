"""
Limitador de intentos fallidos de login (OWASP ASVS V2.2 / A07).

Ventana deslizante en memoria. Se cuentan los FALLOS por correo y por IP; un
login correcto borra el contador del correo. Pensado para una sola instancia de
User_MS (la del compose). Si se escala a varias réplicas, mover el contador a
Redis/PostgreSQL.
"""
import threading
import time
from collections import defaultdict, deque


class LoginRateLimiter:
    def __init__(self, max_per_email: int, max_per_ip: int, window_seconds: int):
        self.max_per_email = max_per_email
        self.max_per_ip = max_per_ip
        self.window = window_seconds
        self._email: dict[str, deque[float]] = defaultdict(deque)
        self._ip: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _prune(self, bucket: deque, now: float) -> None:
        while bucket and now - bucket[0] > self.window:
            bucket.popleft()

    def retry_after(self, email: str, ip: str) -> int:
        """Segundos que debe esperar; 0 si puede intentar."""
        now = time.monotonic()
        with self._lock:
            waits = [0]
            for bucket, limit in ((self._email[email], self.max_per_email), (self._ip[ip], self.max_per_ip)):
                self._prune(bucket, now)
                if len(bucket) >= limit:
                    waits.append(int(self.window - (now - bucket[0])) + 1)
            return max(waits)

    def register_failure(self, email: str, ip: str) -> None:
        now = time.monotonic()
        with self._lock:
            self._email[email].append(now)
            self._ip[ip].append(now)

    def register_success(self, email: str) -> None:
        with self._lock:
            self._email.pop(email, None)

    def reset(self) -> None:
        with self._lock:
            self._email.clear()
            self._ip.clear()


_limiter: LoginRateLimiter | None = None


def get_login_rate_limiter() -> LoginRateLimiter:
    global _limiter
    if _limiter is None:
        from app.core.config import get_settings
        s = get_settings()
        _limiter = LoginRateLimiter(s.login_max_attempts, s.login_max_attempts_per_ip, s.login_window_seconds)
    return _limiter
