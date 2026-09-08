from passlib.context import CryptContext
from passlib.exc import UnknownHashError


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class BcryptPasswordService:
    def hash(self, password: str) -> str:
        return hash_password(password)

    def verify(self, plain_password: str, hashed_password: str) -> bool:
        return verify_password(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except (UnknownHashError, ValueError):
        return False
