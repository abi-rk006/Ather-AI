import os
import logging
from typing import Optional, Any

logger = logging.getLogger("anna_rag.firebase")

try:
    import firebase_admin
    from firebase_admin import credentials, firestore, storage
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    logger.warning("firebase_admin package not found. Using fallback mock database.")

_firebase_app = None
_firestore_db = None


def init_firebase(credentials_path: Optional[str] = None, project_id: Optional[str] = None):
    global _firebase_app, _firestore_db

    if not FIREBASE_AVAILABLE:
        logger.info("Firebase SDK not active; running in memory-store mode.")
        return None

    if _firebase_app is not None:
        return _firebase_app

    try:
        resolved_path = None
        candidates = [
            credentials_path,
            "./app/serviceAccountKey.json",
            "./serviceAccountKey.json",
            os.path.join(os.path.dirname(__file__), "..", "serviceAccountKey.json"),
            os.path.join(os.path.dirname(__file__), "..", "..", "serviceAccountKey.json"),
        ]
        for p in candidates:
            if p and os.path.exists(p):
                resolved_path = os.path.abspath(p)
                break

        if resolved_path:
            import json
            sa_project_id = None
            try:
                with open(resolved_path, "r", encoding="utf-8") as f:
                    sa_info = json.load(f)
                    sa_project_id = sa_info.get("project_id")
            except Exception as e:
                logger.debug(f"Could not parse project_id from service account file: {e}")

            actual_project_id = sa_project_id or project_id or "rag-project-8f3e6"
            cred = credentials.Certificate(resolved_path)
            _firebase_app = firebase_admin.initialize_app(cred, {
                "projectId": actual_project_id
            })
            logger.info(f"Firebase Admin initialized with service account at: {resolved_path} (Project: {actual_project_id})")
        elif os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") and os.path.exists(os.environ["GOOGLE_APPLICATION_CREDENTIALS"]):
            cred = credentials.ApplicationDefault()
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin initialized with Application Default Credentials.")
        else:
            logger.info("No Firebase service account found. Operating in local development mode.")
            return None
            
        _firestore_db = firestore.client()
        return _firebase_app
    except Exception as e:
        logger.warning(f"Could not connect to Firebase Admin ({e}). Operating in local mock mode.")
        return None


def get_firestore_client() -> Optional[Any]:
    global _firestore_db
    if _firestore_db is None and FIREBASE_AVAILABLE:
        try:
            _firestore_db = firestore.client()
        except Exception:
            pass
    return _firestore_db
