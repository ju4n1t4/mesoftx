from app.application.use_cases import users as use_cases
from app.infrastructure.composition import build_context
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.interfaces.api.v1.dependencies import db_session, get_current_user, require_user_manager
from app.interfaces.api.v1.schemas import UserCreate, UserResponse, UserUpdate
router = APIRouter(prefix='/users', tags=['Users'], dependencies=[Depends(get_current_user)])

@router.get('', response_model=list[UserResponse])
def list_users(db: Session=Depends(db_session), current_user=Depends(get_current_user)) -> list[UserResponse]:
    return use_cases.list_users(context=build_context(db), current_user=current_user)

@router.get('/{user_id}', response_model=UserResponse)
def get_user(user_id: int, db: Session=Depends(db_session), current_user=Depends(get_current_user)) -> UserResponse:
    return use_cases.get_user(user_id=user_id, context=build_context(db), current_user=current_user)

@router.post('', response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session=Depends(db_session), current_user=Depends(get_current_user)) -> UserResponse:
    return use_cases.create_user(payload=payload, context=build_context(db), current_user=current_user)

@router.put('/{user_id}', response_model=UserResponse)
def update_user(user_id: int, payload: UserUpdate, db: Session=Depends(db_session), current_user=Depends(require_user_manager)) -> UserResponse:
    return use_cases.update_user(user_id=user_id, payload=payload, context=build_context(db), current_user=current_user)

@router.delete('/{user_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: Session=Depends(db_session), current_user=Depends(require_user_manager)):
    """Borra un profesor/auditor. Antes borra en cascada sus rúbricas en
    Assesment_MS; si hay periodos cerrados -> 409; si el servicio no responde
    -> 503 y no borra nada (paso 12)."""
    return await use_cases.delete_user(user_id=user_id, context=build_context(db), current_user=current_user)

@router.patch('/{user_id}/activate', response_model=UserResponse)
def activate_user(user_id: int, db: Session=Depends(db_session), current_user=Depends(require_user_manager)) -> UserResponse:
    return use_cases.activate_user(user_id=user_id, context=build_context(db), current_user=current_user)

@router.patch('/{user_id}/deactivate', response_model=UserResponse)
def deactivate_user(user_id: int, db: Session=Depends(db_session), current_user=Depends(require_user_manager)) -> UserResponse:
    return use_cases.deactivate_user(user_id=user_id, context=build_context(db), current_user=current_user)
