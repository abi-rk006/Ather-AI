import type { MaterialDocument, AppSettings, UserProfile, Workspace, ChatThread, Message, Subject } from '../types';

export const INITIAL_USER: UserProfile = {
  name: 'Student',
  role: 'student',
  email: '',
  workspace: '',
  quotaUsedMb: 0,
  quotaLimitMb: 2048,
  activeVectorsCount: 0,
};

export const INITIAL_SUBJECTS: Subject[] = [];

export const INITIAL_WORKSPACES: Workspace[] = [];

export const INITIAL_SETTINGS: AppSettings = {
  llmProvider: 'groq',
  llmBaseUrl: 'https://api.groq.com/openai/v1',
  primaryApiKey: '',
  secondaryApiKey: '',
  fallbackEnabled: true,
  selectedModel: 'llama-3.3-70b-versatile',
  temperature: 0.2,
  samplingMode: 'deterministic',
  maxTokens: 8192,
  defaultAnsweringMode: 'exam',
  defaultSearchScope: 'textbook_and_materials',
  retrieval: {
    retrievalMode: 'hybrid',
    hybridVectorWeight: 0.7,
    hybridBm25Weight: 0.3,
    enableReranking: true,
    rerankerModel: 'bge-reranker-large',
    topK: 4,
    parentChunkSize: 2000,
    childChunkSize: 400,
    chunkOverlap: 50,
  },
  storage: {
    sqliteStatus: 'connected',
    chromaStatus: 'connected',
    collectionName: 'anna_university_child_chunks_v1',
  },
};

export const INITIAL_DOCUMENTS: MaterialDocument[] = [];

export const INITIAL_THREADS: ChatThread[] = [
  {
    id: 'thread-default',
    title: 'New Study Session',
    lastUpdated: 'Just now',
    messageCount: 0,
    category: 'Curriculum',
  },
];

export const INITIAL_MESSAGES: Message[] = [];
