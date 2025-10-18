export interface Document {
  id: string;
  title: string;
  filename: string;
  type: 'contract' | 'report' | 'article' | 'other';
  summary?: string;
  entities?: {
    people: string[];
    organizations: string[];
    dates: string[];
    amounts: string[];
  };
  metadata: {
    pages: number;
    fileSize: number;
    uploadedAt: string;
    uploadedBy: string;
  };
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  thumbnail?: string;
  url?: string;
}

export interface ProcessingStatus {
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  steps: {
    extraction?: 'pending' | 'in_progress' | 'completed' | 'failed';
    summary?: 'pending' | 'in_progress' | 'completed' | 'failed';
    entities?: 'pending' | 'in_progress' | 'completed' | 'failed';
    embeddings?: 'pending' | 'in_progress' | 'completed' | 'failed';
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Source[];
  metadata?: {
    model?: string;
    tokensUsed?: number;
    cost?: number;
    cached?: boolean;
  };
}

export interface Source {
  chunkId: string;
  text: string;
  page: number;
  relevanceScore: number;
}

export interface SearchResult {
  documentId: string;
  title: string;
  snippet: string;
  score: number;
  scoreBreakdown: {
    keyword: number;
    semantic: number;
    recency: number;
    popularity: number;
  };
  metadata: {
    type: string;
    author: string;
    uploadedAt: string;
    pages: number;
  };
}

export interface UsageAnalytics {
  totalCost: number;
  breakdown: {
    embeddings: { cost: number; requests: number };
    chat: {
      cost: number;
      requests: number;
      byModel: Record<string, { cost: number; requests: number }>;
    };
    summaries: { cost: number; requests: number };
  };
  savings: {
    cachingEnabled: number;
    modelOptimization: number;
  };
  topDocuments: {
    documentId: string;
    title: string;
    cost: number;
    requests: number;
  }[];
}
