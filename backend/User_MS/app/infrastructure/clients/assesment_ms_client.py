import httpx

from app.core.config import get_settings


class AssesmentMsClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.base_url = settings.assesment_ms_url
        self.headers = {"X-Service-Token": settings.service_token}

    async def delete_rubrics(self, **filters: int) -> tuple[bool, list[str]]:
        """filters: evaluator_user_id= | subjects_id= | student_id=
        Devuelve (ok, periodos_cerrados). Si hay cerrados, ok=False y no borra."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.delete(
                f"{self.base_url}/api/v1/internal/rubric",
                params=filters,
                headers=self.headers,
            )
            if resp.status_code == 409:
                return False, resp.json().get("closed_periods", [])
            resp.raise_for_status()
            return True, []

    async def delete_schedule_subjects(self, subjects_id: int) -> None:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.delete(
                f"{self.base_url}/api/v1/internal/schedule-subjects",
                params={"subjects_id": subjects_id},
                headers=self.headers,
            )
            resp.raise_for_status()

    async def delete_so_schedule_by_period(self, period_id: int) -> tuple[bool, list[str]]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.delete(
                f"{self.base_url}/api/v1/internal/so-schedule",
                params={"period_id": period_id},
                headers=self.headers,
            )
            if resp.status_code == 409:
                return False, resp.json().get("closed_periods", [])
            resp.raise_for_status()
            return True, []

    async def delete_so_by_college(self, college_id: str) -> tuple[bool, list[str]]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.delete(
                f"{self.base_url}/api/v1/internal/so",
                params={"college_id": college_id},
                headers=self.headers,
            )
            if resp.status_code == 409:
                return False, resp.json().get("closed_periods", [])
            resp.raise_for_status()
            return True, []
