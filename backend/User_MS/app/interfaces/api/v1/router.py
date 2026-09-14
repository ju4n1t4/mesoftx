from fastapi import APIRouter

from app.interfaces.api.v1 import auth, catalogs, internal, me, public, students, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(public.router)
api_router.include_router(users.router)
api_router.include_router(me.router)
api_router.include_router(students.router)
api_router.include_router(catalogs.router)
api_router.include_router(internal.router)
