/**
 * useAIChat - Custom hook for AI chat functionality
 * Manages chat sessions, messages, and localStorage persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sendChat, listProviders } from '../services/ai.service';
import type {
  AIMessage,
  ChatSession,
  AIProvider,
  AIProviderInfo,
} from '../types/ai';

const STORAGE_KEY = 'ai-chat-sessions';
const ACTIVE_SESSION_KEY = 'ai-active-session';

/**
 * Load sessions from localStorage
 */
const loadSessions = (): ChatSession[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
};

/**
 * Save sessions to localStorage
 */
const saveSessions = (sessions: ChatSession[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving sessions:', error);
  }
};

/**
 * Generate a title from the first message
 */
const generateTitle = (message: string): string => {
  const maxLength = 50;
  const cleaned = message.trim().replace(/\n/g, ' ');
  return cleaned.length > maxLength
    ? cleaned.substring(0, maxLength) + '...'
    : cleaned;
};

export const useAIChat = () => {
  const queryClient = useQueryClient();
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  });

  // Get active session
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // Sync sessions to localStorage whenever they change
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  // Sync active session ID to localStorage
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  }, [activeSessionId]);

  // Query providers
  const {
    data: providersData,
    isLoading: providersLoading,
    refetch: refetchProviders,
  } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: listProviders,
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Refresh every minute
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      message,
      provider,
    }: {
      message: string;
      provider: AIProvider;
    }) => {
      return await sendChat({ message, provider });
    },
    onSuccess: (response, variables) => {
      // Add AI response to the active session
      if (activeSessionId) {
        setSessions((prev) =>
          prev.map((session) => {
            if (session.id === activeSessionId) {
              const aiMessage: AIMessage = {
                id: `msg-${Date.now()}-ai`,
                role: 'assistant',
                content: response.content,
                provider: response.provider,
                timestamp: Date.now(),
                metadata: {
                  model: response.model,
                  tokens: response.tokens?.total,
                },
              };
              return {
                ...session,
                messages: [...session.messages, aiMessage],
                updatedAt: Date.now(),
              };
            }
            return session;
          })
        );
      }
    },
  });

  /**
   * Create a new chat session
   */
  const createSession = useCallback((provider: AIProvider = 'claude') => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      provider,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    return newSession;
  }, []);

  /**
   * Send a message in the active session
   */
  const sendMessage = useCallback(
    async (content: string, provider?: AIProvider) => {
      if (!activeSessionId) {
        // Create a new session if none exists
        const session = createSession(provider);
        setActiveSessionId(session.id);
      }

      const currentSession = sessions.find((s) => s.id === activeSessionId);
      const messageProvider = provider || currentSession?.provider || 'claude';

      // Add user message immediately
      const userMessage: AIMessage = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      setSessions((prev) =>
        prev.map((session) => {
          if (session.id === activeSessionId) {
            // Update title from first message
            const newTitle =
              session.messages.length === 0
                ? generateTitle(content)
                : session.title;

            return {
              ...session,
              title: newTitle,
              messages: [...session.messages, userMessage],
              provider: messageProvider,
              updatedAt: Date.now(),
            };
          }
          return session;
        })
      );

      // Send to AI
      await sendMessageMutation.mutateAsync({
        message: content,
        provider: messageProvider,
      });
    },
    [activeSessionId, sessions, createSession, sendMessageMutation]
  );

  /**
   * Delete a session
   */
  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
    }
  }, [activeSessionId]);

  /**
   * Clear all sessions
   */
  const clearAllSessions = useCallback(() => {
    setSessions([]);
    setActiveSessionId(null);
  }, []);

  /**
   * Export session as markdown
   */
  const exportSessionAsMarkdown = useCallback((sessionId: string): string => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return '';

    let markdown = `# ${session.title}\n\n`;
    markdown += `**Provider:** ${session.provider}\n`;
    markdown += `**Created:** ${new Date(session.createdAt).toLocaleString()}\n\n`;
    markdown += `---\n\n`;

    session.messages.forEach((msg) => {
      const role = msg.role === 'user' ? 'You' : 'AI';
      markdown += `### ${role}\n\n`;
      markdown += `${msg.content}\n\n`;
      if (msg.metadata?.model) {
        markdown += `*Model: ${msg.metadata.model}*\n\n`;
      }
      markdown += `---\n\n`;
    });

    return markdown;
  }, [sessions]);

  /**
   * Search sessions
   */
  const searchSessions = useCallback((query: string): ChatSession[] => {
    const lowerQuery = query.toLowerCase();
    return sessions.filter(
      (session) =>
        session.title.toLowerCase().includes(lowerQuery) ||
        session.messages.some((msg) =>
          msg.content.toLowerCase().includes(lowerQuery)
        )
    );
  }, [sessions]);

  return {
    // Sessions
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createSession,
    deleteSession,
    clearAllSessions,
    searchSessions,
    exportSessionAsMarkdown,

    // Messages
    sendMessage,
    isLoading: sendMessageMutation.isPending,
    error: sendMessageMutation.error,

    // Providers
    providers: providersData?.providers || [],
    availableProviders: providersData?.available || [],
    providersLoading,
    refetchProviders,
  };
};
