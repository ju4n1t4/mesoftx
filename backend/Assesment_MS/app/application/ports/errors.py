"""Application errors independent from persistence and transport adapters."""
class RepositoryError(Exception):
    pass

class EntityAlreadyExistsError(RepositoryError):
    pass

class EntityNotFoundError(RepositoryError):
    pass

class InvalidReferenceError(RepositoryError):
    pass

class ApplicationError(Exception):
    def __init__(self, code: str, message: str, metadata: dict | None = None):
        super().__init__(message)
        self.code = code
        self.metadata = metadata or {}

class RemoteServiceError(Exception):
    pass
