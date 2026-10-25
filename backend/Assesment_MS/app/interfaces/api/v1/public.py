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
from app.application.dto import PublicIndicatorsResponse
from app.application.services.public_indicators import build_public_response

router = APIRouter(prefix="/public", tags=["Vista pública"])

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
