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
  Subject,
} from '../types';
import { INITIAL_SETTINGS } from './mockData';

const getBaseApiUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').trim();
  const cleaned = envUrl.replace(/\/+$/, '');
  return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
};

const API_BASE_URL = getBaseApiUrl();

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

  // Send Chat message with Answering Mode & Search Scope support (SSE Streaming Enabled)
  async sendMessage(
    prompt: string,
    answeringMode: AnsweringMode = 'exam',
    searchScope: SearchScope = 'textbook_and_materials',
    history: Message[] = [],
    examMarksFormat: ExamMarksFormat = '13-mark',
    onChunk?: (token: string) => void,
    llmConfig?: {
      provider?: string;
      endpoint?: string;
      apiKey?: string;
      fallbackApiKey?: string;
      model?: string;
      fallbackModel?: string;
      fallbackEndpoint?: string;
      fallbackProvider?: string;
      temperature?: number;
    },
    onCitations?: (citations: Citation[]) => void,
    onStatusNotice?: (notice: any) => void
  ): Promise<{ response: string; citations: Citation[]; telemetry: { tokens: number; tps: number; ttft: string }; statusNotice?: any }> {
    // 1. True SSE Streaming when onChunk callback is active
    if (onChunk) {
      try {
        const streamRes = await fetch(`${API_BASE_URL}/chat/stream`, {
          method: 'POST',
          headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            prompt,
            answeringMode,
            searchScope,
            examMarksFormat,
            history,
            llmProvider: llmConfig?.provider,
            llmEndpoint: llmConfig?.endpoint,
            llmApiKey: llmConfig?.apiKey,
            llmFallbackApiKey: llmConfig?.fallbackApiKey,
            llmModel: llmConfig?.model,
            llmFallbackModel: llmConfig?.fallbackModel,
            llmFallbackEndpoint: llmConfig?.fallbackEndpoint,
            llmFallbackProvider: llmConfig?.fallbackProvider,
            temperature: llmConfig?.temperature,
          }),
        });

        if (streamRes.ok && streamRes.body) {
          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder();
          let accumulatedResponse = '';
          let finalCitations: Citation[] = [];
          let finalTelemetry = { tokens: 0, tps: 0, ttft: '0ms' };
          let finalStatusNotice: any = null;

          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const jsonStr = trimmed.slice(5).trim();
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.statusNotice) {
                  finalStatusNotice = parsed.statusNotice;
                  if (onStatusNotice) {
                    onStatusNotice(parsed.statusNotice);
                  }
                }
                if (parsed.citations && Array.isArray(parsed.citations)) {
                  finalCitations = parsed.citations;
                  if (onCitations) {
                    onCitations(parsed.citations);
                  }
                }
                if (parsed.token) {
                  accumulatedResponse += parsed.token;
                  onChunk(parsed.token);
                }
                if (parsed.done) {
                  if (parsed.citations) finalCitations = parsed.citations;
                  if (parsed.telemetry) finalTelemetry = parsed.telemetry;
                  if (parsed.statusNotice) finalStatusNotice = parsed.statusNotice;
                }
              } catch {
                // Ignore partial chunks
              }
            }
          }

          if (accumulatedResponse.trim()) {
            return {
              response: accumulatedResponse,
              citations: finalCitations,
              telemetry: finalTelemetry,
              statusNotice: finalStatusNotice,
            };
          }
        }
      } catch (streamErr) {
        console.warn('Streaming endpoint failed or interrupted, falling back to standard POST:', streamErr);
      }
    }

    // 2. Synchronous fallback POST
    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          prompt,
          answeringMode,
          searchScope,
          examMarksFormat,
          history,
          llmProvider: llmConfig?.provider,
          llmEndpoint: llmConfig?.endpoint,
          llmApiKey: llmConfig?.apiKey,
          llmFallbackApiKey: llmConfig?.fallbackApiKey,
          llmModel: llmConfig?.model,
          llmFallbackModel: llmConfig?.fallbackModel,
          llmFallbackEndpoint: llmConfig?.fallbackEndpoint,
          llmFallbackProvider: llmConfig?.fallbackProvider,
          temperature: llmConfig?.temperature,
        }),
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
  }

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/documents/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to delete document' }));
      throw new Error(err.detail || `Failed to delete document (${res.status})`);
    }
  }

  // Curriculum Subjects API
  async getSubjects(): Promise<Subject[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/subjects`, {
        headers: this.getAuthHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Error fetching curriculum subjects:', err);
    }

    return [];
  }

  async createSubject(data: { code: string; name: string; department?: string; semester?: number; description?: string }): Promise<Subject> {
    const res = await fetch(`${API_BASE_URL}/subjects`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create subject' }));
      throw new Error(err.detail || `Error creating subject (${res.status})`);
    }

    return await res.json();
  }

  async deleteSubject(subjectId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/subjects/${subjectId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to delete subject' }));
      throw new Error(err.detail || `Error deleting subject (${res.status})`);
    }
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

  async testLlmEndpoint(
    provider: string,
    baseUrl: string,
    apiKey: string,
    model: string
  ): Promise<{ success: boolean; latencyMs: number; message: string; modelsAvailable?: string[] }> {
    try {
      const res = await fetch(`${API_BASE_URL}/settings/test-llm`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ provider, baseUrl, apiKey, model }),
      });
      if (res.ok) {
        return await res.json();
      }
      const err = await res.json().catch(() => ({ message: `Error ${res.status}` }));
      return {
        success: false,
        latencyMs: 0,
        message: err.message || `Test failed with status ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: 0,
        message: err?.message || 'Could not connect to backend test service.',
      };
    }
  }

  async verifyApiKey(key: string, provider: string = 'groq', baseUrl?: string, model?: string): Promise<{ success: boolean; latencyMs: number; message?: string; modelsAvailable?: string[] }> {
    const defaultModel =
      provider === 'groq'
        ? 'qwen/qwen3.8-27b'
        : provider === 'nvidia'
        ? 'meta/llama-3.3-70b-instruct'
        : provider === 'gemini'
        ? 'gemini-2.5-flash'
        : provider === 'openai'
        ? 'gpt-4o'
        : 'local-model';
    const res = await this.testLlmEndpoint(provider, baseUrl || '', key, model || defaultModel);
    return {
      success: res.success,
      latencyMs: res.latencyMs,
      message: res.message,
      modelsAvailable: res.modelsAvailable,
    };
  }
}

export const apiClient = new ApiClient();
