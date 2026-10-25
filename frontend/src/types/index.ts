export type AnsweringMode = 'exam' | 'explain' | 'retrieval';
export type SearchScope = 'textbook_only' | 'textbook_and_materials' | 'materials_only';
export type ExamMarksFormat = '2-mark' | '13-mark';

// Preserved for backward-compatibility if referenced in settings
export type RetrievalMode = 'hybrid' | 'vector' | 'bm25' | 'parent_child';

export interface Citation {
  id: string;
  docTitle: string;
  docType: 'pdf' | 'markdown' | 'txt' | 'doc' | 'csv';
  pageOrSection: string;
  chunkText: string;
  parentChunkText?: string;
  parentText?: string;
  relevanceScore: number;
  topic: string;
  chunkId: string;
  bookReference?: string;
  chapter?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  content: string;
  answeringMode?: AnsweringMode;
  searchScope?: SearchScope;
  examMarksFormat?: ExamMarksFormat;
  tokens?: number;
  tokensPerSec?: number;
  ttft?: string;
  modelUsed?: string;
  citations?: Citation[];
  attachments?: { name: string; size: string; type: string }[];
  isStreaming?: boolean;
}

export interface ChatThread {
  id: string;
  title: string;
  lastUpdated: string;
  messageCount: number;
  category?: string;
}

export interface MaterialDocument {
  id: string;
  title: string;
  fileType: 'pdf' | 'md' | 'markdown' | 'docx' | 'doc' | 'txt' | 'csv';
  category: 'distributed' | 'bigdata' | 'deeplearning' | 'security' | 'uiux' | 'testing';
  sourceType?: 'primary_textbook' | 'student_document';
  ownerId?: string;
  sizeBytes: number;
  uploadedAt: string;
  chunkCount: number;
  parentChunkCount: number;
  vectorStatus: 'indexed' | 'indexing' | 'failed';
  vectorDimensions: number;
  summary: string;
  chunks?: { id: string; text: string; parentText?: string; vectorId: string }[];
}

export interface LLMProviderConfig {
  id: string;
  name: string;
  provider: 'OpenAI' | 'Anthropic' | 'Google' | 'Ollama';
  contextWindow: string;
  description: string;
  isAvailable: boolean;
}

export interface RetrievalSettings {
  retrievalMode: RetrievalMode;
  hybridVectorWeight: number; // 0 to 1
  hybridBm25Weight: number;   // 0 to 1
  enableReranking: boolean;
  rerankerModel: string;
  topK: number;
  parentChunkSize: number;
  childChunkSize: number;
  chunkOverlap: number;
}

export interface AppSettings {
  primaryApiKey: string;
  secondaryApiKey: string;
  fallbackEnabled: boolean;
  selectedModel: string;
  temperature: number;
  samplingMode: 'deterministic' | 'creative';
  maxTokens: number;
  defaultAnsweringMode: AnsweringMode;
  defaultSearchScope: SearchScope;
  retrieval: RetrievalSettings;
  storage: {
    sqliteStatus: 'connected' | 'error';
    chromaStatus: 'connected' | 'error';
    collectionName: string;
  };
}

export interface UserProfile {
  name: string;
  role: string;
  email: string;
  avatarUrl?: string;
  workspace: string;
  quotaUsedMb: number;
  quotaLimitMb: number;
  activeVectorsCount: number;
}

export interface Workspace {
  id: string;
  name: string;
  role: string;
  membersCount: number;
  documentsCount: number;
}

export interface RetrievalSource {
  book_title: string;
  unit?: string;
  chapter?: string;
  heading_path?: string;
  page_start?: number;
  page_end?: number;
  document_id: string;
  source_type: string;
}

export interface RetrievalResultItem {
  chunk_id: string;
  rank: number;
  rrf_score: number;
  text: string;
  parent_id?: string;
  parent_text?: string;
  source: RetrievalSource;
}

export interface RetrievalPagination {
  page: number;
  page_size: number;
  total_results: number;
  total_pages: number;
  has_more: boolean;
}

export interface RetrievalSearchRequest {
  query: string;
  subject_id?: string;
  source_scope?: string;
  sort_by?: 'relevance' | 'page_order';
  page?: number;
  page_size?: number;
  top_k?: number;
}

export interface RetrievalSearchResponse {
  query: string;
  subject_id?: string;
  source_scope: string;
  results: RetrievalResultItem[];
  pagination: RetrievalPagination;
}
