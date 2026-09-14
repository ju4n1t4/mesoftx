import httpx

from app.core.config import get_settings


class UserMsClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.base_url = settings.user_ms_url
        self.headers = {"X-Service-Token": settings.service_token}

    async def user_exists(self, user_id: int) -> bool:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{self.base_url}/api/v1/internal/users/{user_id}", headers=self.headers)
            return resp.status_code == 200

    async def subject_exists(self, nrc: int) -> bool:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{self.base_url}/api/v1/internal/subjects/{nrc}", headers=self.headers)
            return resp.status_code == 200

    async def period_exists(self, period_id: int) -> bool:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{self.base_url}/api/v1/internal/periods/{period_id}", headers=self.headers)
            return resp.status_code == 200

    async def student_exists(self, student_id: int) -> bool:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{self.base_url}/api/v1/students/{student_id}", headers=self.headers)
            return resp.status_code == 200

    async def student_enrolled(self, student_id: int, nrc: int) -> bool:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{self.base_url}/api/v1/subjects/{nrc}/students/{student_id}",
                headers=self.headers,
            )
            return resp.status_code == 200

    async def teacher_has_subject(self, user_id: int, nrc: int) -> bool:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{self.base_url}/api/v1/teacher-subjects/{user_id}/{nrc}",
                headers=self.headers,
            )
            return resp.status_code == 200

    async def teacher_subjects(self, user_id: int) -> list[int]:
        """Lista de NRC del profesor. La usa GET /me/assessments."""
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{self.base_url}/api/v1/internal/teacher-subjects",
                params={"user_id": user_id},
                headers=self.headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def enrolled_counts(self, nrcs: list[int]) -> dict[int, int]:
        """Estudiantes matriculados por NRC, en UNA sola llamada (anti N+1)."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/v1/internal/subjects/students/count",
                json={"nrcs": nrcs},
                headers=self.headers,
            )
            resp.raise_for_status()
            return {int(k): v for k, v in resp.json().items()}
