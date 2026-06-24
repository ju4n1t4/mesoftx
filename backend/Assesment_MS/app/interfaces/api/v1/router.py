from fastapi import APIRouter

from app.interfaces.api.v1 import assesment

api_router = APIRouter()
api_router.include_router(assesment.router)
