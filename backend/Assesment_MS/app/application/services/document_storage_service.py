from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile


class DocumentStorageError(Exception):
    pass


class DocumentStorageService:
    def __init__(self, base_path: Path):
        self.base_path = base_path

    async def save(self, file: UploadFile) -> str:
        original_name = Path(file.filename or "").name
        if not original_name:
            raise DocumentStorageError("Attached document must have a filename.")

        destination_dir = self.base_path
        destination_dir.mkdir(parents=True, exist_ok=True)

        safe_name = self._build_safe_name(original_name)
        destination = destination_dir / safe_name

        try:
            with destination.open("wb") as output:
                while chunk := await file.read(1024 * 1024):
                    output.write(chunk)
        except OSError as exc:
            raise DocumentStorageError("Attached document could not be stored.") from exc
        finally:
            await file.close()

        return safe_name

    def _build_safe_name(self, filename: str) -> str:
        source = Path(filename)
        stem = "".join(char if char.isalnum() or char in ("-", "_") else "_" for char in source.stem).strip("_")
        suffix = "".join(char for char in source.suffix.lower() if char.isalnum() or char == ".")
        normalized_stem = stem or "document"
        return f"{normalized_stem}_{uuid4().hex}{suffix}"
