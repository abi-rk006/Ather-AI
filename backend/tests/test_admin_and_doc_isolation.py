import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.firestore_service import firestore_service

client = TestClient(app)


def test_admin_login_success():
    response = client.post(
        "/api/auth/admin-login",
        json={"email": "admin@annauniv.edu", "passcode": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "admin"
    assert data["token"].startswith("admin_")
    assert data["user"]["role"] == "admin"


def test_admin_login_failure():
    response = client.post(
        "/api/auth/admin-login",
        json={"email": "admin@annauniv.edu", "passcode": "wrong_password"}
    )
    assert response.status_code == 401


def test_student_cannot_upload_predefined_textbook():
    # Student headers with mock student token
    student_headers = {"Authorization": "Bearer mock_student_token_123"}
    
    files = {"file": ("test_textbook.md", "# Unit 1: Network Protocols\n\nContent here.", "text/markdown")}
    data = {
        "category": "distributed",
        "source_type": "primary_textbook",
        "book_title": "Unauthorized Textbook",
    }
    
    response = client.post("/api/documents", headers=student_headers, files=files, data=data)
    assert response.status_code == 403
    assert "Only administrators" in response.json()["detail"]


def test_admin_can_upload_predefined_textbook():
    admin_headers = {"Authorization": "Bearer admin_session_auth_token"}
    
    files = {"file": ("anna_curriculum_cn.md", "# Chapter 1: Physical Layer\n\nTransmission media details.", "text/markdown")}
    data = {
        "category": "distributed",
        "source_type": "primary_textbook",
        "book_title": "Anna Univ Official Computer Networks",
    }
    
    response = client.post("/api/documents", headers=admin_headers, files=files, data=data)
    assert response.status_code == 201
    doc_data = response.json()
    assert doc_data["source_type"] == "primary_textbook"
    assert doc_data["owner_id"] == "system"
    assert doc_data["filename"] == "Anna Univ Official Computer Networks"
    
    # Verify that a regular student can see this predefined textbook in their list
    student_headers = {"Authorization": "Bearer mock_student_token_123"}
    list_res = client.get("/api/documents", headers=student_headers)
    assert list_res.status_code == 200
    docs = list_res.json()
    matching = [d for d in docs if d["document_id"] == doc_data["document_id"]]
    assert len(matching) == 1
    assert matching[0]["source_type"] == "primary_textbook"


def test_student_personal_document_isolation():
    # Student A uploads a personal document
    student_a_headers = {"Authorization": "Bearer student_a_token"}
    files = {"file": ("student_a_notes.md", "# Student A Private Notes\nPersonal study notes.", "text/markdown")}
    data = {
        "category": "distributed",
        "source_type": "student_document",
    }
    res_a = client.post("/api/documents", headers=student_a_headers, files=files, data=data)
    assert res_a.status_code == 201
    doc_a = res_a.json()
    assert doc_a["source_type"] == "student_document"
    
    # Student A can see their own document
    list_a = client.get("/api/documents", headers=student_a_headers).json()
    assert any(d["document_id"] == doc_a["document_id"] for d in list_a)
    
    # Student B CANNOT see Student A's document
    student_b_headers = {"Authorization": "Bearer student_b_token"}
    list_b = client.get("/api/documents", headers=student_b_headers).json()
    assert not any(d["document_id"] == doc_a["document_id"] for d in list_b)
    
    # Student B CANNOT delete Student A's document
    del_res = client.delete(f"/api/documents/{doc_a['document_id']}", headers=student_b_headers)
    assert del_res.status_code == 403
    
    # Student A CAN delete their own document
    del_res_a = client.delete(f"/api/documents/{doc_a['document_id']}", headers=student_a_headers)
    assert del_res_a.status_code == 200
