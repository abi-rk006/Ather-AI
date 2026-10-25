# AETHER AI — Enterprise Grounded RAG Platform (Frontend)

High-fidelity React + TypeScript frontend converted from the design prototype specifications in `stitch_rag_ai_chat_interface`, adhering to the **Fidelity Modern** design system.

---

## 🚀 Tech Stack

- **Framework**: React 19 + TypeScript (Vite 8)
- **Styling**: Tailwind CSS v4 + PostCSS with Material 3 Tonal Tokens
- **Icons & Fonts**: Google Material Symbols Outlined, Google Fonts ([Lexend](https://fonts.google.com/specimen/Lexend), [DM Sans](https://fonts.google.com/specimen/DM+Sans), [Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro)), Lucide React
- **Target Backend**: FastAPI + LangChain + Chroma Vector Store + SQLite

---

## 📐 Architecture & Key Features

### 1. Grounded RAG Chat Interface (`ChatInterface.tsx`)
- **Multi-Turn Chat History**: Interactive thread switching with topic index.
- **Architectural Executive Summary**: 3-pillar breakdown (Edge Ingress, Redlock Lease Barrier, Sharded Consumers).
- **Topology Pipeline Visual**: SVG topology dataflow diagram representing `Envoy Edge -> Redis Redlock -> Kafka Ingress -> SQLite Ledger`.
- **Code Block Rendering**: Syntax-highlighted Go implementation with line numbers, code copy actions, and telemetry tokens.
- **Citation Chips & Evidence**: Instant feedback on retrieved document sources with relevance score badges.

### 2. Multi-Strategy Retrieval Modes (`PromptInput.tsx`)
- **Hybrid Fusion**: Blends dense Chroma vector embeddings with BM25 keyword inverted indexing.
- **Chroma Vector Only**: Cosine similarity against 1536-dimensional embeddings.
- **BM25 Keyword**: Exact lexical search across technical specifications.
- **Parent-Child Hierarchical Reranker**: Fine-grained child chunks (400 chars) for high-similarity retrieval matched with broad parent windows (2,000 chars) for hallucination-free LLM synthesis.

### 3. Context Inspection Drawer (`DocumentViewer.tsx`)
- Slide-over grounding inspector showing verbatim chunk text, page/section markers, match percentage, and topic category.
- **"Parent RFC" Toggle**: Inspect the larger parent chunk context directly from within the drawer.
- Single-click citation copying to clipboard.

### 4. Knowledge Vault & Materials (`MaterialsList.tsx` & `UploadModal.tsx`)
- **Live Vector Telemetry Banner**: Active documents count, Chroma vector chunks, SQLite WAL storage size, and p99 latency SLAs.
- **Topic Category Filters**: *All, Distributed computing, Big data, Deep learning, Security, UI/UX, Software Testing*.
- **Drag-and-Drop Ingestion**: Ingest PDFs, Markdown, DOCX, and TXT files with real-time chunking progress.
- **Persistent Chunk Inspector**: Inspect raw vector records and child-parent relationships.

### 5. Settings, Model Selection & Failover (`SettingsView.tsx`)
- **Configurable LLM Providers**: GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro, Llama 3.3 70B.
- **Failover Backup Key**: Standby secondary key automatically utilized upon HTTP 429 rate limit or quota exhaustion.
- **Interactive Latency Test**: Verify provider connectivity with real-time ms ping.
- **Retrieval Sliders**: Real-time hybrid weight balancing (Vector % vs BM25 %).

### 6. Authentication & Workspaces (`LoginView.tsx` & `WorkspaceAccess.tsx`)
- Workspace switcher supporting domain isolation (e.g., *Production Engineering*, *FinTech Ledger*, *SecOps Vault*).
- SOC2 Type II and 256-bit SSL trust badges.

---

## 🛠️ Scripts & Commands

```bash
# Run local development server
npm run dev

# Build production bundle
npm run build

# Preview production build
npm run preview
```
