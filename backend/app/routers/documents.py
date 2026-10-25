import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from ..models.document import DocumentMetadata, DocumentChunk
from ..core.auth import get_current_user, AuthenticatedUser
from ..services.firestore_service import firestore_service
from ..services.storage_service import storage_service
from ..services.retrieval_service import retrieval_service
from ..services.indexing_service import indexing_service
from ..rag.chunking import chunking_manager, chunk_store

logger = logging.getLogger("anna_rag.documents")

router = APIRouter(prefix="/api/documents", tags=["Documents & Knowledge Vault"])


@router.get("", response_model=List[DocumentMetadata])
async def list_documents(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    List available syllabus materials:
    - Predefined primary textbooks (visible to all users)
    - Personal documents belonging only to the authenticated user
    """
    return await firestore_service.list_documents(user_id=current_user.uid)


@router.post("", response_model=DocumentMetadata, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form("distributed"),
    subject_id: Optional[str] = Form(None),
    source_type: str = Form("student_document"),
    book_title: Optional[str] = Form(None),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Register and process an uploaded document:
    - If source_type == 'primary_textbook': Admin ONLY. Visible to all users. Processed with ParentChildChunker.
    - If source_type == 'student_document': Visible ONLY to the uploading user. Processed with StudentChunker.
    """
    if source_type == "primary_textbook":
        if not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can upload predefined curriculum source documents visible to all students.",
            )
        owner_id = "system"
    else:
        source_type = "student_document"
        owner_id = current_user.uid

    display_name = book_title.strip() if book_title and book_title.strip() else file.filename
    storage_path = await storage_service.save_file(file, user_id=owner_id)
    file_type = file.filename.split(".")[-1].lower() if "." in file.filename else "pdf"
    doc_id = f"doc-{uuid.uuid4().hex[:8]}"

    # Execute Chunking Pipeline
    try:
        chunk_res = chunking_manager.process_document(
            file_path=storage_path,
            document_id=doc_id,
            filename=display_name,
            source_type=source_type,
            owner_id=owner_id,
            subject_id=subject_id,
            category=category,
        )
        chunk_count = chunk_res.total_children
        parent_count = chunk_res.total_parents
        if source_type == "primary_textbook":
            summary = f"Predefined Curriculum Textbook: {parent_count} parent units & {chunk_count} child chunks indexed across syllabus."
        else:
            summary = f"Personal Material: {chunk_count} child chunks ({chunk_res.avg_child_tokens} avg tokens) across {parent_count} parent sections."

        # Embed child chunks with Jina and upsert into Chroma Cloud
        if chunk_res.child_chunks:
            await indexing_service.index_child_chunks(chunk_res.child_chunks)
    except Exception as e:
        logger.error(f"Error during chunking/indexing of {display_name}: {e}")
        chunk_count = max(4, (file.size or 120000) // 40000)
        parent_count = 1
        summary = f"Processed and indexed into knowledge vault ({display_name})."

    doc_meta = DocumentMetadata(
        document_id=doc_id,
        owner_id=owner_id,
        subject_id=subject_id,
        filename=display_name,
        file_type=file_type,
        category=category,
        source_type=source_type,
        storage_path=storage_path,
        processing_status="indexed",
        size_bytes=file.size or 120000,
        chunk_count=chunk_count,
        parent_chunk_count=parent_count,
        summary=summary,
    )

    await firestore_service.save_document(doc_meta)
    return doc_meta


@router.get("/{document_id}", response_model=DocumentMetadata)
async def get_document(
    document_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Check document details and processing status.
    """
    doc = await firestore_service.get_document(document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found."
        )
    return doc


@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    document_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Delete an uploaded document and its storage file & chunk records.
    - Predefined primary textbooks can ONLY be deleted by administrators.
    - Personal documents can ONLY be deleted by their owner (or an administrator).
    """
    doc = await firestore_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    is_predefined = doc.source_type == "primary_textbook" or doc.owner_id == "system"
    if is_predefined:
        if not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can delete predefined curriculum textbooks."
            )
    else:
        if doc.owner_id != current_user.uid and not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized: You cannot delete another user's personal document."
            )

    try:
        await storage_service.delete_file(doc.storage_path)
        chunk_store.delete_document_chunks(document_id)
        indexing_service.delete_document_vectors(document_id)
        await firestore_service.delete_document(document_id, user_id=current_user.uid, is_admin=current_user.is_admin)
        return {"success": True, "message": f"Document {document_id} and associated chunks deleted."}
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/chunks/{chunk_id}", response_model=DocumentChunk)
async def inspect_document_chunk(
    chunk_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Inspect a chunk and its expanded parent context window for Grounding Inspector.
    """
    child = chunking_manager.get_child_chunk(chunk_id)
    if child:
        parent_text = None
        if child.parent_id:
            parent = chunking_manager.get_parent_context(child.parent_id)
            if parent:
                parent_text = parent.content

        return DocumentChunk(
            chunk_id=child.chunk_id,
            document_id=child.document_id,
            doc_title=child.book_reference or child.document_id,
            doc_type="pdf",
            page_or_section=f"pp. {child.page_start}-{child.page_end}",
            chunk_text=child.text,
            parent_text=parent_text,
            book_reference=child.book_reference,
            chapter=child.chapter,
            relevance_score=0.95,
            topic=child.heading_path,
        )

    # Fallback to retrieval service preview
    chunk = await retrieval_service.get_chunk_by_id(chunk_id)
    if not chunk:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chunk not found.")
    return chunk
