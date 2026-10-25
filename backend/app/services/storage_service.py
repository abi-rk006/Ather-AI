import os
import shutil
import logging
from typing import Optional
from fastapi import UploadFile
from ..config import settings

logger = logging.getLogger("anna_rag.storage")


class StorageService:
    def __init__(self):
        self.storage_dir = settings.STORAGE_DIR
        os.makedirs(self.storage_dir, exist_ok=True)

    async def save_file(self, file: UploadFile, user_id: str) -> str:
        """
        Saves uploaded file to disk (or Firebase Storage if configured) and returns storage path.
        """
        user_dir = os.path.join(self.storage_dir, user_id)
        os.makedirs(user_dir, exist_ok=True)
        file_path = os.path.join(user_dir, file.filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"Saved uploaded file {file.filename} for user {user_id} at {file_path}")
        return file_path

    async def delete_file(self, storage_path: str) -> bool:
        if storage_path and os.path.exists(storage_path):
            try:
                os.remove(storage_path)
                return True
            except Exception as e:
                logger.error(f"Failed to delete file {storage_path}: {e}")
        return False


storage_service = StorageService()
