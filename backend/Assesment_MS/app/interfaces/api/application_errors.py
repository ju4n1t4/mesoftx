from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.application.ports.errors import ApplicationError, EntityAlreadyExistsError, EntityNotFoundError, InvalidReferenceError, InvalidReferenceError


def install_application_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApplicationError)
    async def application_error(request: Request, exc: ApplicationError):
        codes = {'bad_request': 400, 'invalid': 422, 'conflict': 409, 'invalid_response': 502, 'unavailable': 503, 'configuration': 503, 'not_found': 404, 'forbidden': 403, 'unauthorized': 401, 'rate_limited': 429}
        return JSONResponse(status_code=codes.get(exc.code, 500), content={'detail': str(exc), 'code': exc.code, **exc.metadata}, headers={'Retry-After': '5'} if exc.code == 'unavailable' else None)

    @app.exception_handler(EntityNotFoundError)
    async def missing_entity(request: Request, exc: EntityNotFoundError):
        return JSONResponse(status_code=404, content={'detail': str(exc)})

    @app.exception_handler(EntityAlreadyExistsError)
    async def duplicate_entity(request: Request, exc: EntityAlreadyExistsError):
        return JSONResponse(status_code=409, content={'detail': str(exc)})

    @app.exception_handler(InvalidReferenceError)
    async def invalid_reference(request: Request, exc: InvalidReferenceError):
        return JSONResponse(status_code=422, content={'detail': str(exc)})

    @app.exception_handler(InvalidReferenceError)
    async def invalid_reference(request: Request, exc: InvalidReferenceError):
        return JSONResponse(status_code=422, content={'detail': str(exc)})
