/**
 * AI Service - REAL API integration with ai-wrapper
 * Connects to localhost:3200 or via proxy at localhost:3004/api
 */

import type {
  SendChatRequest,
  SendChatResponse,
  ListProvidersResponse,
  AIProvider,
} from '../types/ai';

const AI_WRAPPER_URL = import.meta.env.VITE_AI_WRAPPER_URL || 'http://localhost:3200';
const USE_PROXY = import.meta.env.VITE_USE_AI_PROXY === 'true';

/**
 * Get the base URL for AI API calls
 * Can use direct connection or proxy through gateway
 */
const getBaseURL = (): string => {
  if (USE_PROXY) {
    return 'http://localhost:3004/api/ai';
  }
  return `${AI_WRAPPER_URL}/ai`;
};

/**
 * Fetch with timeout support
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout = 30000
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * List available AI providers
 */
export const listProviders = async (): Promise<ListProvidersResponse> => {
  const baseURL = getBaseURL();
  const url = `${baseURL}/providers`;

  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list providers: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error listing providers:', error);
    // Return fallback with all providers offline
    return {
      available: [],
      providers: [
        { id: 'claude', name: 'Claude', available: false, status: 'offline' },
        { id: 'copilot', name: 'GitHub Copilot', available: false, status: 'offline' },
        { id: 'q', name: 'Amazon Q', available: false, status: 'offline' },
        { id: 'gemini', name: 'Google Gemini', available: false, status: 'offline' },
        { id: 'codex', name: 'OpenAI Codex', available: false, status: 'offline' },
      ],
    };
  }
};

/**
 * Send a chat message to AI
 * Supports all 5 providers: Claude, Copilot, Q, Gemini, Codex
 */
export const sendChat = async (
  request: SendChatRequest
): Promise<SendChatResponse> => {
  const baseURL = getBaseURL();
  const url = `${baseURL}/chat`;

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      },
      30000 // 30s timeout for AI responses
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `AI request failed: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('AI request timed out. Please try again.');
      }
      throw error;
    }
    throw new Error('Unknown error occurred while sending chat');
  }
};

/**
 * Check if a specific provider is available
 */
export const checkProviderAvailability = async (
  provider: AIProvider
): Promise<boolean> => {
  try {
    const { available } = await listProviders();
    return available.includes(provider);
  } catch (error) {
    console.error(`Error checking ${provider} availability:`, error);
    return false;
  }
};

/**
 * Test connection to AI wrapper service
 */
export const testConnection = async (): Promise<{
  connected: boolean;
  providers: AIProvider[];
}> => {
  try {
    const { available } = await listProviders();
    return {
      connected: true,
      providers: available,
    };
  } catch (error) {
    return {
      connected: false,
      providers: [],
    };
  }
};

export const aiService = {
  listProviders,
  sendChat,
  checkProviderAvailability,
  testConnection,
};
