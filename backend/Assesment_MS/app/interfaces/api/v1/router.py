from fastapi import APIRouter

from app.interfaces.api.v1 import assesment, dashboards, internal, public

api_router = APIRouter()
api_router.include_router(assesment.router)
api_router.include_router(dashboards.router)
api_router.include_router(public.router)
api_router.include_router(internal.router)
