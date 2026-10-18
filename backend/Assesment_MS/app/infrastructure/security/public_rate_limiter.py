"""Límite de peticiones por IP para el endpoint público (ventana de 60 s, en memoria)."""
import threading
import time
from collections import defaultdict, deque


class PublicRateLimiter:
    def __init__(self, per_minute: int):
        self.per_minute = per_minute
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, ip: str) -> bool:
        now = time.monotonic()
        with self._lock:
            bucket = self._hits[ip]
            while bucket and now - bucket[0] > 60:
                bucket.popleft()
            if len(bucket) >= self.per_minute:
                return False
            bucket.append(now)
            if len(self._hits) > 5000:          # evita crecimiento sin límite
                for k in [k for k, v in self._hits.items() if not v or now - v[-1] > 60]:
                    self._hits.pop(k, None)
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


_limiter: PublicRateLimiter | None = None


def get_public_rate_limiter() -> PublicRateLimiter:
    global _limiter
    if _limiter is None:
        from app.core.config import get_settings
        _limiter = PublicRateLimiter(get_settings().public_rate_limit_per_minute)
    return _limiter
