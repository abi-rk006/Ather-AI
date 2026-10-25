import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from ..core.firebase import get_firestore_client
from ..models.user import UserProfile
from ..models.subject import Subject
from ..models.document import DocumentMetadata
from ..models.chat import ChatSession, ChatMessage
from ..models.settings import UserPreferences

logger = logging.getLogger("anna_rag.firestore")


class FirestoreService:
    def __init__(self):
        # In-memory store fallback for offline / development testing
        self._mem_users: Dict[str, Dict[str, Any]] = {}
        self._mem_subjects: Dict[str, Dict[str, Any]] = {
            "cs8591": {
                "subject_id": "cs8591",
                "code": "CS8591",
                "name": "Computer Networks",
                "department": "CSE",
                "semester": 5,
                "textbook_ids": ["doc-tanenbaum-cn", "doc-kurose-cn"],
                "description": "Anna University Regulation 2021/2017: OSI layers, TCP/IP, flow control, routing."
            },
            "it8501": {
                "subject_id": "it8501",
                "code": "IT8501",
                "name": "Web Technology",
                "department": "IT",
                "semester": 5,
                "textbook_ids": ["doc-deitel-web"],
                "description": "Client-server architecture, HTTP protocols, JavaScript, and backend APIs."
            },
            "cs8492": {
                "subject_id": "cs8492",
                "code": "CS8492",
                "name": "Database Management Systems",
                "department": "CSE",
                "semester": 4,
                "textbook_ids": ["doc-korth-dbms"],
                "description": "Relational algebra, SQL, normalization, concurrency control, and indexing."
            },
            "cs3391": {
                "subject_id": "cs3391",
                "code": "CS3391",
                "name": "Database Management Systems",
                "department": "CSE",
                "semester": 4,
                "textbook_ids": ["doc-korth-dbms"],
                "description": "Anna University Regulation 2021: Relational Model, SQL, Transactions, and Storage."
            },
            "ad3391": {
                "subject_id": "ad3391",
                "code": "AD3391",
                "name": "Database Design and Management",
                "department": "AIDS",
                "semester": 3,
                "textbook_ids": ["doc-korth-dbms"],
                "description": "Anna University Regulation 2021: Data Modeling, Query Optimization, and NoSQL."
            }
        }
        self._mem_documents: Dict[str, Dict[str, Any]] = {
            "doc-tanenbaum-cn": {
                "document_id": "doc-tanenbaum-cn",
                "owner_id": "system",
                "subject_id": "cs8591",
                "filename": "Computer_Networks_Tanenbaum_5th_Ed.pdf",
                "file_type": "pdf",
                "category": "distributed",
                "source_type": "primary_textbook",
                "storage_path": "system/textbooks/Computer_Networks_Tanenbaum_5th_Ed.pdf",
                "processing_status": "indexed",
                "size_bytes": 14500000,
                "chunk_count": 482,
                "parent_chunk_count": 94,
                "summary": "Primary reference textbook for Anna University CS8591 curriculum."
            },
            "doc-korth-dbms": {
                "document_id": "doc-korth-dbms",
                "owner_id": "system",
                "subject_id": "cs8492",
                "filename": "Database_System_Concepts_Silberschatz_Korth.pdf",
                "file_type": "pdf",
                "category": "bigdata",
                "source_type": "primary_textbook",
                "storage_path": "system/textbooks/Database_System_Concepts_Korth.pdf",
                "processing_status": "indexed",
                "size_bytes": 18200000,
                "chunk_count": 620,
                "parent_chunk_count": 128,
                "summary": "Core textbook covering relational transactions, ACID properties, and B+ trees."
            }
        }
        self._mem_sessions: Dict[str, Dict[str, Any]] = {}
        self._mem_messages: Dict[str, List[Dict[str, Any]]] = {}
        self._mem_preferences: Dict[str, Dict[str, Any]] = {}

    # 1. Users
    async def get_user(self, user_id: str) -> Optional[UserProfile]:
        db = get_firestore_client()
        if db:
            try:
                doc = db.collection("users").document(user_id).get()
                if doc.exists:
                    return UserProfile(**doc.to_dict())
            except Exception as e:
                logger.warning(f"Firestore get_user error ({e}), reading from cache.")
        
        data = self._mem_users.get(user_id)
        if data:
            return UserProfile(**data)
        return None

    async def save_user(self, user: UserProfile) -> UserProfile:
        db = get_firestore_client()
        if db:
            try:
                db.collection("users").document(user.user_id).set(user.model_dump(mode="json"))
            except Exception as e:
                logger.warning(f"Firestore save_user error ({e}), saving to memory store.")
        self._mem_users[user.user_id] = user.model_dump(mode="json")
        return user

    # 2. Subjects
    async def list_subjects(self) -> List[Subject]:
        subjects_map = {k: Subject(**v) for k, v in self._mem_subjects.items()}
        db = get_firestore_client()
        if db:
            try:
                docs = db.collection("subjects").stream()
                for d in docs:
                    s = Subject(**d.to_dict())
                    subjects_map[s.subject_id] = s
            except Exception as e:
                logger.warning(f"Firestore list_subjects error ({e}), using default catalog.")
        return list(subjects_map.values())

    async def save_subject(self, subject: Subject) -> Subject:
        db = get_firestore_client()
        data = subject.model_dump(mode="json")
        if db:
            try:
                db.collection("subjects").document(subject.subject_id).set(data)
            except Exception as e:
                logger.warning(f"Firestore save_subject error ({e}), saving to memory store.")
        self._mem_subjects[subject.subject_id] = data
        return subject

    async def delete_subject(self, subject_id: str) -> bool:
        db = get_firestore_client()
        if db:
            try:
                db.collection("subjects").document(subject_id).delete()
            except Exception as e:
                logger.warning(f"Firestore delete_subject error ({e}).")
        self._mem_subjects.pop(subject_id, None)
        return True

    # 3. Documents
    async def list_documents(self, user_id: str) -> List[DocumentMetadata]:
        db = get_firestore_client()
        if db:
            try:
                # Query predefined textbooks (visible to all) and user's personal documents
                docs = db.collection("documents").stream()
                results = []
                for d in docs:
                    m = d.to_dict()
                    if m.get("source_type") == "primary_textbook" or m.get("owner_id") in [user_id, "system"]:
                        results.append(DocumentMetadata(**m))
                if results:
                    return results
            except Exception as e:
                logger.warning(f"Firestore list_documents error ({e}), using memory store.")

        # Memory store query
        results = []
        for d in self._mem_documents.values():
            if d.get("source_type") == "primary_textbook" or d.get("owner_id") in [user_id, "system"]:
                results.append(DocumentMetadata(**d))
        return results

    async def get_document(self, document_id: str) -> Optional[DocumentMetadata]:
        db = get_firestore_client()
        if db:
            try:
                doc = db.collection("documents").document(document_id).get()
                if doc.exists:
                    return DocumentMetadata(**doc.to_dict())
            except Exception as e:
                logger.warning(f"Firestore get_document error ({e}), checking memory store.")
        
        data = self._mem_documents.get(document_id)
        if data:
            return DocumentMetadata(**data)
        return None

    async def save_document(self, doc_meta: DocumentMetadata) -> DocumentMetadata:
        db = get_firestore_client()
        data = doc_meta.model_dump(mode="json")
        if db:
            try:
                db.collection("documents").document(doc_meta.document_id).set(data)
            except Exception as e:
                logger.warning(f"Firestore save_document error ({e}), saving to memory store.")
        self._mem_documents[doc_meta.document_id] = data
        return doc_meta

    async def delete_document(self, document_id: str, user_id: str, is_admin: bool = False) -> bool:
        doc = await self.get_document(document_id)
        if not doc:
            return False
        
        is_predefined = doc.source_type == "primary_textbook" or doc.owner_id == "system"
        if is_predefined and not is_admin:
            raise PermissionError("Only administrators can delete predefined textbooks.")
        if not is_predefined and doc.owner_id != user_id and not is_admin:
            raise PermissionError("Unauthorized to delete another user's personal document.")
        
        db = get_firestore_client()
        if db:
            try:
                db.collection("documents").document(document_id).delete()
            except Exception as e:
                logger.warning(f"Firestore delete_document error ({e}).")
        self._mem_documents.pop(document_id, None)
        return True

    # 4. Chat Sessions and Messages
    async def create_session(self, session: ChatSession) -> ChatSession:
        db = get_firestore_client()
        data = session.model_dump(mode="json")
        if db:
            try:
                db.collection("users").document(session.user_id).collection("sessions").document(session.session_id).set(data)
            except Exception as e:
                logger.warning(f"Firestore create_session error ({e}).")
        self._mem_sessions[session.session_id] = data
        return session

    async def save_message(self, message: ChatMessage) -> ChatMessage:
        db = get_firestore_client()
        data = message.model_dump(mode="json")
        if db:
            try:
                db.collection("users").document(message.user_id).collection("sessions").document(message.session_id).collection("messages").document(message.message_id).set(data)
            except Exception as e:
                logger.warning(f"Firestore save_message error ({e}).")
        
        if message.session_id not in self._mem_messages:
            self._mem_messages[message.session_id] = []
        self._mem_messages[message.session_id].append(data)
        return message

    # 5. User Settings / Preferences
    async def get_preferences(self, user_id: str) -> UserPreferences:
        db = get_firestore_client()
        if db:
            try:
                doc = db.collection("users").document(user_id).collection("settings").document("preferences").get()
                if doc.exists:
                    return UserPreferences(**doc.to_dict())
            except Exception as e:
                logger.warning(f"Firestore get_preferences error ({e}).")
        
        data = self._mem_preferences.get(user_id)
        if data:
            return UserPreferences(**data)
        return UserPreferences()

    async def update_preferences(self, user_id: str, prefs: UserPreferences) -> UserPreferences:
        db = get_firestore_client()
        data = prefs.model_dump(mode="json")
        if db:
            try:
                db.collection("users").document(user_id).collection("settings").document("preferences").set(data, merge=True)
            except Exception as e:
                logger.warning(f"Firestore update_preferences error ({e}).")
        self._mem_preferences[user_id] = data
        return prefs


firestore_service = FirestoreService()
