"""
Vista pública para evaluadores externos (RF-08, RF-09, RF-10).

ÚNICO grupo de endpoints sin autenticación. Garantías de diseño:
  * Solo lectura (GET) y solo AGREGADOS por Student Outcome.
  * No expone ids ni nombres de estudiantes, profesores, NRC ni evidencias.
  * Un SO con menos de `public_min_group_size` estudiantes se suprime (k-anonimato).
  * Límite de peticiones por IP y respuesta cacheable 5 minutos.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.http_security import client_ip
from app.infrastructure.repositories.sqlalchemy_repositories import DashboardRepository
from app.infrastructure.security.public_rate_limiter import get_public_rate_limiter
from app.interfaces.api.v1.dependencies import db_session
from app.interfaces.api.v1.schemas import PublicIndicatorsResponse, PublicLevelItem, PublicSoIndicator

router = APIRouter(prefix="/public", tags=["Vista pública"])

LEVEL_LABELS = {4: "Supera", 3: "Bueno", 2: "En desarrollo", 1: "Insatisfactorio"}
LEVEL_SCORE = {4: 100, 3: 75, 2: 50, 1: 25}


def build_public_response(
    outcomes: list[tuple[str, str]],
    counts: list[tuple[str, int, int]],
    students_by_so: dict[str, int],
    min_group_size: int,
) -> PublicIndicatorsResponse:
    """Función pura (probada sin base de datos): agrega y aplica la supresión."""
    by_so: dict[str, dict[int, int]] = {}
    for so_id, rank, n in counts:
        by_so.setdefault(so_id, {})[rank] = n

    items: list[PublicSoIndicator] = []
    averages: list[int] = []
    grand_total = 0
    for so_id, description in outcomes:
        dist = by_so.get(so_id, {})
        total = sum(dist.values())
        students = students_by_so.get(so_id, 0)
        suppressed = total > 0 and students < min_group_size
        levels: list[PublicLevelItem] = []
        if total > 0 and not suppressed:
            levels = [
                PublicLevelItem(rank=r, label=LEVEL_LABELS[r], pct=round(100 * dist.get(r, 0) / total))
                for r in (4, 3, 2, 1)
            ]
            averages.append(round(sum(LEVEL_SCORE[r] * n for r, n in dist.items()) / total))
            grand_total += total
        items.append(PublicSoIndicator(
            so_id=so_id, description=description,
            assessments=0 if suppressed else total,
            students=0 if suppressed else students,
            suppressed=suppressed, levels=levels,
        ))
    return PublicIndicatorsResponse(
        min_group_size=min_group_size,
        average_pct=round(sum(averages) / len(averages)) if averages else None,
        total_assessments=grand_total,
        items=items,
    )


@router.get("/indicators", response_model=PublicIndicatorsResponse)
def public_indicators(request: Request, response: Response, db: Session = Depends(db_session)):
    if not get_public_rate_limiter().allow(client_ip(request)):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiadas solicitudes. Intente de nuevo en un minuto.",
            headers={"Retry-After": "60"},
        )
    repo = DashboardRepository(db)
    result = build_public_response(
        repo.all_outcomes(), repo.public_level_counts(), repo.public_students_by_so(),
        get_settings().public_min_group_size,
    )
    response.headers["Cache-Control"] = "public, max-age=300"
    return result
