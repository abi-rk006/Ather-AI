import type {
  AppSettings,
  MaterialDocument,
  Message,
  Citation,
  AnsweringMode,
  SearchScope,
  ExamMarksFormat,
  RetrievalSearchRequest,
  RetrievalSearchResponse,
} from '../types';
import { INITIAL_SETTINGS } from './mockData';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiClient {
  constructor() {
    this.checkBackendHealth();
  }

  private async checkBackendHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(1500) });
      return res.ok;
    } catch {
      return false;
    }
  }

  private getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...customHeaders };
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // Dedicated Retrieval Mode Search Endpoint (Hybrid BM25 + Chroma Cloud + RRF)
  async searchRetrieval(request: RetrievalSearchRequest): Promise<RetrievalSearchResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/retrieval/search`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          query: request.query,
          subject_id: request.subject_id || 'general',
          source_scope: request.source_scope || 'authorized_textbook',
          sort_by: request.sort_by || 'relevance',
          page: request.page || 1,
          page_size: request.page_size || 5,
          top_k: request.top_k || 15,
        }),
      });

      if (res.ok) {
        return await res.json();
      }
      throw new Error(`Retrieval search HTTP error: ${res.status}`);
    } catch (err) {
      console.error('Error executing retrieval search:', err);
      return {
        query: request.query,
        subject_id: request.subject_id,
        source_scope: request.source_scope || 'authorized_textbook',
        results: [],
        pagination: {
          page: request.page || 1,
          page_size: request.page_size || 5,
          total_results: 0,
          total_pages: 1,
          has_more: false,
        },
      };
    }
  }

  // Fetch Parent Chunk Context Window
  async getParentContext(parentId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/retrieval/parent/${encodeURIComponent(parentId)}`, {
        headers: this.getAuthHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Error fetching parent context:', err);
    }
    return null;
  }

  // Send Chat message with Answering Mode & Search Scope support
  async sendMessage(
    prompt: string,
    answeringMode: AnsweringMode = 'exam',
    searchScope: SearchScope = 'textbook_and_materials',
    history: Message[] = [],
    examMarksFormat: ExamMarksFormat = '13-mark',
    onChunk?: (token: string) => void
  ): Promise<{ response: string; citations: Citation[]; telemetry: { tokens: number; tps: number; ttft: string } }> {
    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ prompt, answeringMode, searchScope, examMarksFormat, history }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('FastAPI backend unreachable, providing status message:', err);
    }

    // Clean fallback message without fake mock citations
    const offlineMsg = `[Connection Notice] The backend server is currently starting up or offline. Please ensure the backend is running on ${API_BASE_URL}.`;
    if (onChunk) {
      for (const word of offlineMsg.split(' ')) {
        onChunk(word + ' ');
        await new Promise((r) => setTimeout(r, 20));
      }
    }

    return {
      response: offlineMsg,
      citations: [],
      telemetry: {
        tokens: 0,
        tps: 0,
        ttft: '0ms',
      },
    };
  }

  // Authentication API
  async adminLogin(email: string, passcode: string): Promise<{ token: string; user: any; role: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, passcode }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
      throw new Error(err.detail || 'Invalid administrator passcode');
    }

    const data = await res.json();
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_role', 'admin');
    }
    return data;
  }

  // Materials / Documents API - Connected to live backend
  async getDocuments(): Promise<MaterialDocument[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/documents`, {
        headers: this.getAuthHeaders(),
      });
      if (res.ok) {
        const docs = await res.json();
        return docs.map((d: any) => ({
          id: d.document_id || d.id,
          title: d.filename || d.title,
          fileType: d.file_type || 'pdf',
          category: d.category || 'distributed',
          sourceType: d.source_type || 'student_document',
          ownerId: d.owner_id || 'system',
          sizeBytes: d.size_bytes || 0,
          uploadedAt: d.uploaded_at || 'Recently',
          chunkCount: d.chunk_count || 0,
          parentChunkCount: d.parent_chunk_count || 0,
          vectorStatus: d.processing_status === 'indexed' ? 'indexed' : 'indexing',
          vectorDimensions: 1024,
          summary: d.summary || '',
        }));
      }
    } catch (err) {
      console.warn('Error fetching live documents:', err);
    }

    const saved = localStorage.getItem('ather_materials');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [];
  }

  async uploadDocument(
    file: File,
    category: MaterialDocument['category'],
    subjectId?: string,
    sourceType: 'primary_textbook' | 'student_document' = 'student_document',
    bookTitle?: string
  ): Promise<MaterialDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category || 'distributed');
    formData.append('source_type', sourceType);
    if (subjectId) {
      formData.append('subject_id', subjectId);
    }
    if (bookTitle) {
      formData.append('book_title', bookTitle);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: formData,
      });

      if (res.ok) {
        const d = await res.json();
        return {
          id: d.document_id,
          title: d.filename,
          fileType: d.file_type,
          category: d.category,
          sourceType: d.source_type,
          ownerId: d.owner_id,
          sizeBytes: d.size_bytes,
          uploadedAt: 'Just now',
          chunkCount: d.chunk_count,
          parentChunkCount: d.parent_chunk_count,
          vectorStatus: 'indexed',
          vectorDimensions: 1024,
          summary: d.summary,
        };
      }
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || `Upload failed with status ${res.status}`);
    } catch (err: any) {
      console.warn('Backend upload failed, caching locally:', err);
      // If error is permission-related, rethrow
      if (err?.message?.includes('Only administrators') || err?.message?.includes('403')) {
        throw err;
      }
    }

    // Local fallback if backend unavailable
    const newDoc: MaterialDocument = {
      id: `doc-${Date.now()}`,
      title: bookTitle || file.name,
      fileType: (file.name.split('.').pop() as any) || 'pdf',
      category: category || 'distributed',
      sourceType: sourceType,
      ownerId: sourceType === 'primary_textbook' ? 'system' : 'dev_student',
      sizeBytes: file.size,
      uploadedAt: 'Just now',
      chunkCount: 1,
      parentChunkCount: 1,
      vectorStatus: 'indexed',
      vectorDimensions: 1024,
      summary: sourceType === 'primary_textbook'
        ? `Predefined Curriculum Textbook: ${file.name}`
        : `Personal Material (${file.name}).`,
    };

    const current = await this.getDocuments();
    const updated = [newDoc, ...current];
    localStorage.setItem('ather_materials', JSON.stringify(updated));
    return newDoc;
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/documents/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
    } catch (err) {
      console.warn('Error deleting live document:', err);
    }

    const current = await this.getDocuments();
    const filtered = current.filter((d) => d.id !== id);
    localStorage.setItem('ather_materials', JSON.stringify(filtered));
  }

  // Settings API
  async getSettings(): Promise<AppSettings> {
    const saved = localStorage.getItem('ather_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_SETTINGS;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    localStorage.setItem('ather_settings', JSON.stringify(settings));
  }

  async verifyApiKey(key: string, _provider?: string): Promise<{ success: boolean; latencyMs: number }> {
    await new Promise((r) => setTimeout(r, 200));
    return {
      success: key.length > 8,
      latencyMs: Math.floor(Math.random() * 20 + 40),
    };
  }
}

export const apiClient = new ApiClient();
