/**
 * AIChat Page
 * Three-column layout: History | Chat | Provider Info
 */

import React, { useState, useEffect } from 'react';
import { Card, Title, Text } from '@tremor/react';
import {
  MessageSquare,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Menu,
  X,
} from 'lucide-react';
import { useAIChat } from '../hooks/useAIChat';
import { ChatInterface } from '../components/features/ai-chat/ChatInterface';
import { ChatHistory } from '../components/features/ai-chat/ChatHistory';
import { ProviderSelector } from '../components/features/ai-chat/ProviderSelector';
import type { AIProvider } from '../types/ai';

export const AIChat: React.FC = () => {
  const {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createSession,
    deleteSession,
    clearAllSessions,
    exportSessionAsMarkdown,
    sendMessage,
    isLoading,
    error,
    providers,
    availableProviders,
    providersLoading,
    refetchProviders,
  } = useAIChat();

  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('claude');
  const [showHistory, setShowHistory] = useState(true);
  const [showProviders, setShowProviders] = useState(true);

  // Update provider when session changes
  useEffect(() => {
    if (activeSession) {
      setSelectedProvider(activeSession.provider);
    }
  }, [activeSession]);

  const handleSendMessage = async (message: string) => {
    await sendMessage(message, selectedProvider);
  };

  const handleProviderChange = (provider: AIProvider) => {
    setSelectedProvider(provider);
    // If there's an active session, update it
    if (activeSession) {
      // The session will use the new provider for next message
    }
  };

  const handleCreateSession = (provider: AIProvider) => {
    const session = createSession(provider);
    setActiveSessionId(session.id);
    setSelectedProvider(provider);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-blue-500" />
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                AI Chat Interface
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Connected to ai-wrapper service (localhost:3200)
              </p>
            </div>
          </div>

          {/* Mobile toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="lg:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Toggle history"
            >
              {showHistory ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => refetchProviders()}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Refresh providers"
            >
              <RefreshCw
                className={`w-5 h-5 ${providersLoading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Error sending message
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {error instanceof Error ? error.message : 'Unknown error occurred'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content - Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Chat History */}
        <div
          className={`${
            showHistory ? 'w-80' : 'w-0'
          } transition-all duration-300 overflow-hidden lg:w-80`}
        >
          <ChatHistory
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={setActiveSessionId}
            onCreateSession={handleCreateSession}
            onDeleteSession={deleteSession}
            onExportSession={exportSessionAsMarkdown}
            onClearAll={clearAllSessions}
          />
        </div>

        {/* Center - Chat Interface */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            session={activeSession}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
          />
        </div>

        {/* Right Sidebar - Provider Info */}
        <div
          className={`${
            showProviders ? 'w-80' : 'w-0'
          } transition-all duration-300 overflow-hidden lg:w-80 border-l border-gray-200 dark:border-gray-700`}
        >
          <div className="h-full overflow-y-auto bg-white dark:bg-gray-800 p-4">
            {/* Provider Selector */}
            <Card className="mb-4">
              <Title>AI Provider</Title>
              <Text className="mb-4">
                Select which AI provider to use for this conversation
              </Text>
              <ProviderSelector
                providers={providers}
                selectedProvider={selectedProvider}
                onSelectProvider={handleProviderChange}
                disabled={isLoading}
              />
            </Card>

            {/* Connection Status */}
            <Card className="mb-4">
              <Title>Connection Status</Title>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    AI Wrapper Service
                  </span>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Connected
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Available Providers
                  </span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    {availableProviders.length} / 5
                  </span>
                </div>
              </div>
            </Card>

            {/* Provider Details */}
            <Card>
              <Title>Provider Details</Title>
              <div className="mt-3 space-y-3">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {provider.name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          provider.available
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {provider.available ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    {provider.models && provider.models.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {provider.models.length} model
                        {provider.models.length > 1 ? 's' : ''} available
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Settings Info */}
            <Card className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <Title>Settings</Title>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p>Chat history is saved locally in your browser.</p>
                <p className="text-xs">
                  <strong>Endpoint:</strong> {import.meta.env.VITE_AI_WRAPPER_URL || 'http://localhost:3200'}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
