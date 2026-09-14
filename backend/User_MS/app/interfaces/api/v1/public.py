from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.infrastructure.repositories.sqlalchemy_repositories import RoleRepository
from app.interfaces.api.v1.dependencies import db_session

# Endpoints PÚBLICOS (sin autenticación) — TEMPORAL PARA LA DEFENSA.
# Exponen solo el catálogo de nombres de perfil, para que la pantalla de login
# habilite los accesos de demostración según los perfiles que existan.
# NOTA: quitar este router cuando se exija usuario para todo el acceso.
router = APIRouter(prefix="/public", tags=["Public (temporal)"])


class PublicRole(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)


@router.get("/roles", response_model=list[PublicRole])
def public_roles(db: Session = Depends(db_session)):
    """Solo id y nombre de los perfiles existentes. Sin usuarios ni permisos."""
    return RoleRepository(db).list_all()
