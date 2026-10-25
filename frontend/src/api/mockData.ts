import type { MaterialDocument, AppSettings, UserProfile, Workspace, ChatThread, Message, Subject } from '../types';

export const INITIAL_USER: UserProfile = {
  name: 'Anna Univ Student',
  role: 'student',
  email: 'student@annauniv.edu',
  workspace: 'CS8591 - Computer Networks',
  quotaUsedMb: 120,
  quotaLimitMb: 2048,
  activeVectorsCount: 1102,
};

export const INITIAL_SUBJECTS: Subject[] = [
  {
    subject_id: 'cs8591',
    code: 'CS8591',
    name: 'Computer Networks',
    department: 'CSE',
    semester: 5,
    textbook_ids: ['doc-tanenbaum-cn', 'doc-kurose-cn'],
    description: 'Anna University Regulation 2021/2017: OSI layers, TCP/IP, flow control, routing.',
  },
  {
    subject_id: 'it8501',
    code: 'IT8501',
    name: 'Web Technology',
    department: 'IT',
    semester: 5,
    textbook_ids: ['doc-deitel-web'],
    description: 'Client-server architecture, HTTP protocols, JavaScript, and backend APIs.',
  },
  {
    subject_id: 'cs8492',
    code: 'CS8492',
    name: 'Database Management Systems',
    department: 'CSE',
    semester: 4,
    textbook_ids: ['doc-korth-dbms'],
    description: 'Relational algebra, SQL, normalization, concurrency control, and indexing.',
  },
  {
    subject_id: 'cs3001',
    code: 'CS3001',
    name: 'UI/UX Design',
    department: 'CSE',
    semester: 6,
    textbook_ids: [],
    description: 'User interface design principles, design systems, usability heuristics, and Figma prototypes.',
  },
  {
    subject_id: 'ccs334',
    code: 'CCS334',
    name: 'Big Data Analytics (BDA)',
    department: 'IT',
    semester: 7,
    textbook_ids: [],
    description: 'Hadoop distributed file system, Apache Spark streaming, and MapReduce analytics.',
  },
];

export const INITIAL_WORKSPACES: Workspace[] = [
  { id: 'cs8591', name: 'CS8591 - Computer Networks', role: 'Student', membersCount: 64, documentsCount: 2 },
  { id: 'it8501', name: 'IT8501 - Web Technology', role: 'Student', membersCount: 58, documentsCount: 1 },
  { id: 'cs8492', name: 'CS8492 - DBMS', role: 'Student', membersCount: 62, documentsCount: 1 },
  { id: 'cs3001', name: 'CS3001 - UI/UX Design', role: 'Student', membersCount: 45, documentsCount: 0 },
  { id: 'ccs334', name: 'CCS334 - Big Data Analytics (BDA)', role: 'Student', membersCount: 50, documentsCount: 0 },
];

export const INITIAL_SETTINGS: AppSettings = {
  primaryApiKey: '',
  secondaryApiKey: '',
  fallbackEnabled: true,
  selectedModel: 'gpt-4o',
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

export const INITIAL_DOCUMENTS: MaterialDocument[] = [
  {
    id: 'doc-tanenbaum-cn',
    title: 'Computer_Networks_Tanenbaum_5th_Ed.pdf',
    fileType: 'pdf',
    category: 'distributed',
    sourceType: 'primary_textbook',
    sizeBytes: 14500000,
    uploadedAt: 'Authorized',
    chunkCount: 482,
    parentChunkCount: 94,
    vectorStatus: 'indexed',
    vectorDimensions: 1024,
    summary: 'Prescribed reference textbook for Anna University CS8591 curriculum: Physical layer, Data Link, MAC, Network and Transport layers.',
  },
  {
    id: 'doc-korth-dbms',
    title: 'Database_System_Concepts_Silberschatz_Korth.pdf',
    fileType: 'pdf',
    category: 'bigdata',
    sourceType: 'primary_textbook',
    sizeBytes: 18200000,
    uploadedAt: 'Authorized',
    chunkCount: 620,
    parentChunkCount: 128,
    vectorStatus: 'indexed',
    vectorDimensions: 1024,
    summary: 'Core reference textbook covering relational algebra, SQL, normalization, concurrency control, B+ trees, and transactions.',
  },
  {
    id: 'doc-deitel-web',
    title: 'Internet_and_World_Wide_Web_Deitel.pdf',
    fileType: 'pdf',
    category: 'uiux',
    sourceType: 'primary_textbook',
    sizeBytes: 11200000,
    uploadedAt: 'Authorized',
    chunkCount: 390,
    parentChunkCount: 82,
    vectorStatus: 'indexed',
    vectorDimensions: 1024,
    summary: 'Prescribed textbook for Anna University IT8501 Web Technology: HTML5, CSS3, DOM scripting, AJAX, REST APIs, and client-server architectures.',
  },
  {
    id: 'doc-csv-1',
    title: 'Anna_University_Curriculum_Regulation_2021.csv',
    fileType: 'csv',
    category: 'distributed',
    sourceType: 'primary_textbook',
    sizeBytes: 184000,
    uploadedAt: 'Authorized',
    chunkCount: 18,
    parentChunkCount: 3,
    vectorStatus: 'indexed',
    vectorDimensions: 1024,
    summary: 'Tabular curriculum mapping for Regulation 2021: Subject codes, unit breakdown, semester credits, and textbook mappings.',
  },
];

export const INITIAL_THREADS: ChatThread[] = [
  {
    id: 'thread-1',
    title: 'Anna University RAG Assistant',
    lastUpdated: 'Just now',
    messageCount: 0,
    category: 'Curriculum',
  },
];

export const INITIAL_MESSAGES: Message[] = [];
