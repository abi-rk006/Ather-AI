# Anna University RAG Study Assistant — Backend (Firebase Version 1)

This backend implements the **Firebase Version 1** architecture for the Anna University RAG Study Assistant. It decouples application management (Firebase Authentication + Cloud Firestore) from the future retrieval and LLM engine (BM25 + Chroma), strictly maintaining clean service interfaces without heavy pipelines.

---

## 1. Architecture Overview

* **FastAPI Backend**: Orchestrates API requests, user authorization, and document storage.
* **Firebase Authentication**: User registration, login, and ID token verification via `Authorization: Bearer <id_token>`.
* **Cloud Firestore**: Stores application records across isolated collections:
  * `users/{userId}`: User profile, role (student/faculty), semester, department.
  * `subjects/{subjectId}`: Anna University curriculum subjects (CS8591, IT8501, CS8492) and prescribed textbook links.
  * `documents/{documentId}`: Document metadata, source type (`primary_textbook` vs `student_document`), and processing status.
  * `users/{userId}/sessions/{sessionId}`: Chat study sessions and metadata.
  * `users/{userId}/sessions/{sessionId}/messages/{messageId}`: Dialogue history, answering mode, and citation references.
  * `users/{userId}/settings/preferences`: User mode preferences, search scopes, and theme.
  * `users/{userId}/progress/{progressId}`: Study history, topics completed, and quiz metrics.
* **File Storage**: Local uploads directory (`./storage_uploads`) with Firebase Storage bucket support.
* **Retrieval & LLM Services**: Maintained as separate, clean service interfaces (`chat_service.py` & `retrieval_service.py`), ready for Chroma + BM25 integration without redesigning frontend or Firestore models.

---

## 2. API Endpoints

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/health` | `GET` | Server health check (probed by frontend `ApiClient`) |
| `/api/auth/me` | `GET` | Get authenticated user profile |
| `/api/auth/profile` | `POST` | Update user profile in Firestore |
| `/api/subjects` | `GET` | List Anna University subjects & prescribed textbooks |
| `/api/chat` | `POST` | Submit a study question in Exam, Explain, or Retrieval Mode |
| `/api/chat/stream` | `POST` | Server-Sent Events (SSE) streaming token generator |
| `/api/retrieval/search` | `POST` | Preview retrieved passages with corpus scope filtering |
| `/api/documents` | `GET` | List available materials (Primary Textbooks + Student Uploads) |
| `/api/documents` | `POST` | Upload and register student material |
| `/api/documents/{id}` | `GET` | Check document details & processing status |
| `/api/documents/{id}` | `DELETE`| Delete uploaded material (Owner-validated) |
| `/api/documents/chunks/{chunk_id}` | `GET` | Inspect chunk and parent context window |
| `/api/exports` | `POST` | Export evidence as TXT, Markdown, or ChatGPT prompt |
| `/api/settings` | `GET` | Get user preferences |
| `/api/settings` | `PATCH`| Update user preferences |

---

## 3. Setup & Running Locally

### Virtual Environment (Python 3.10.19 with `uv`)
```powershell
# From backend directory
.\.venv\Scripts\activate
```

### Running the Server
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger documentation is available at: `http://localhost:8000/docs`.

### Connecting Firebase Credentials
1. Place your Firebase service account private key JSON file in the `backend/` folder (e.g. `serviceAccountKey.json`).
2. Set in `.env`:
   ```env
   FIREBASE_CREDENTIALS_PATH="./serviceAccountKey.json"
   FIREBASE_PROJECT_ID="your-firebase-project-id"
   ```
3. If no credentials file is provided, the backend automatically runs in **Local Development Mode** with an in-memory Firestore fallback store and permissive dev auth tokens.
