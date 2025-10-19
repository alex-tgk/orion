/**
 * AI Chat Types
 * Real AI integration with ai-wrapper service
 */

export type AIProvider =
  | 'claude'
  | 'copilot'
  | 'q'
  | 'gemini'
  | 'codex';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider?: AIProvider;
  timestamp: number;
  metadata?: {
    model?: string;
    tokens?: number;
    error?: string;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: AIMessage[];
  provider: AIProvider;
  createdAt: number;
  updatedAt: number;
}

export interface AIProviderInfo {
  id: AIProvider;
  name: string;
  available: boolean;
  models?: string[];
  status?: 'online' | 'offline' | 'error';
}

export interface SendChatRequest {
  message: string;
  provider?: AIProvider;
  conversationId?: string;
  model?: string;
}

export interface SendChatResponse {
  content: string;
  provider: AIProvider;
  model?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  conversationId?: string;
}

export interface ListProvidersResponse {
  available: AIProvider[];
  providers: AIProviderInfo[];
}
