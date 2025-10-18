import axios from 'axios';
import type { Document, ProcessingStatus, SearchResult, UsageAnalytics } from '@/types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

const mockDocuments: Document[] = [
  {
    id: 'doc1',
    title: 'Q3 2025 Sales Report',
    filename: 'q3-sales-report.pdf',
    type: 'report',
    summary: 'Quarterly sales report showing 12% revenue growth year-over-year.',
    entities: {
      people: ['John Doe', 'Jane Smith'],
      organizations: ['Acme Corp'],
      dates: ['2025-09-30'],
      amounts: ['$1.2M'],
    },
    metadata: {
      pages: 24,
      fileSize: 2048000,
      uploadedAt: '2025-10-15T10:30:00Z',
      uploadedBy: 'admin@example.com',
    },
    status: 'completed',
  },
];

export const documentsApi = {
  async upload(file: File) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      id: 'doc-' + Math.random(),
      filename: file.name,
      url: URL.createObjectURL(file),
    };
  },

  async getAll() {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { documents: mockDocuments, total: mockDocuments.length };
  },

  async getById(id: string): Promise<Document> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const doc = mockDocuments.find((d) => d.id === id);
    if (!doc) throw new Error('Document not found');
    return doc;
  },
};

export const chatApi = {
  async askQuestion(documentId: string, question: string) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      answer: 'Based on the document, the revenue was $1.2M in Q3 2025. [1]',
      sources: [
        {
          chunkId: 'chunk1',
          text: 'Q3 revenue: $1.2M',
          page: 3,
          relevanceScore: 0.92,
        },
      ],
      model: 'gpt-4',
      tokensUsed: 450,
      cost: 0.0045,
      cached: false,
    };
  },
};

export const searchApi = {
  async search(query: string): Promise<{ results: SearchResult[]; totalResults: number }> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      results: mockDocuments.map((doc) => ({
        documentId: doc.id,
        title: doc.title,
        snippet: doc.summary || '',
        score: 0.85,
        scoreBreakdown: { keyword: 0.4, semantic: 0.35, recency: 0.05, popularity: 0.05 },
        metadata: {
          type: doc.type,
          author: doc.metadata.uploadedBy,
          uploadedAt: doc.metadata.uploadedAt,
          pages: doc.metadata.pages,
        },
      })),
      totalResults: mockDocuments.length,
    };
  },
};

export const analyticsApi = {
  async getUsage(): Promise<UsageAnalytics> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      totalCost: 12.45,
      breakdown: {
        embeddings: { cost: 2.1, requests: 450 },
        chat: {
          cost: 8.2,
          requests: 123,
          byModel: { 'gpt-4': { cost: 6.5, requests: 78 } },
        },
        summaries: { cost: 2.15, requests: 24 },
      },
      savings: { cachingEnabled: 18.3, modelOptimization: 5.6 },
      topDocuments: [],
    };
  },
};

export default api;
