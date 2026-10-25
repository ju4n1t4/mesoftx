from typing import Any

from app.application.ports.errors import EntityNotFoundError
from app.application.ports.repositories import UserRepository
from app.application.ports.security import PasswordHasher


class UserService:
    def __init__(self, user_repository: UserRepository, hash_password: PasswordHasher):
        self.user_repository = user_repository
        self.hash_password = hash_password

    def get(self, user_id: int) -> Any:
        user = self.user_repository.get_by_id(user_id)
        if not user:
            raise EntityNotFoundError("User not found.")
        return user

    def list(self) -> list[Any]:
        return self.user_repository.list_all()

    def create(self, data: dict[str, Any]) -> Any:
        if data.get("email"):
            data["email"] = data["email"].lower()
        data["password"] = self.hash_password(data["password"])
        data["active"] = True
        return self.user_repository.create_user(data)

    def update(self, user_id: int, data: dict[str, Any]) -> Any:
        if "email" in data and data["email"]:
            data["email"] = data["email"].lower()
        if "password" in data and data["password"]:
            data["password"] = self.hash_password(data["password"])

        user = self.user_repository.update_user(user_id, data)
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
