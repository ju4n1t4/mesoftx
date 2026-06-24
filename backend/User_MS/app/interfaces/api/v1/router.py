from fastapi import APIRouter

from app.interfaces.api.v1 import auth, catalogs, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(catalogs.router)
