from typing import Any

from app.infrastructure.repositories.sqlalchemy_repositories import EntityNotFoundError, UserRepository
from app.infrastructure.security.password_service import hash_password


class UserService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    def get(self, user_id: int) -> Any:
        user = self.user_repository.get_by_id(user_id)
        if not user:
            raise EntityNotFoundError("User not found.")
        return user

    def list(self) -> list[Any]:
        return self.user_repository.list_all()

    def create(self, data: dict[str, Any]) -> Any:
        subject_ids = data.pop("subject_ids", [])
        data["email"] = data["email"].lower()
        data["password"] = hash_password(data["password"])
        data["active"] = True
        return self.user_repository.create_user(data, subject_ids)

    def update(self, user_id: int, data: dict[str, Any]) -> Any:
        subject_ids = data.pop("subject_ids", None)
        if "email" in data and data["email"]:
            data["email"] = data["email"].lower()
        if "password" in data and data["password"]:
            data["password"] = hash_password(data["password"])

        user = self.user_repository.update_user(user_id, data, subject_ids)
        if not user:
            raise EntityNotFoundError("User not found.")
        return user

    def activate(self, user_id: int) -> Any:
        return self._set_active(user_id, True)

    def deactivate(self, user_id: int) -> Any:
        return self._set_active(user_id, False)

    def _set_active(self, user_id: int, active: bool) -> Any:
        user = self.user_repository.set_active(user_id, active)
        if not user:
            raise EntityNotFoundError("User not found.")
        return user
