/**
 * ChatInterface Component
 * Main chat UI with message list and input
 */

import React, { useEffect, useRef } from 'react';
import { Card } from '@tremor/react';
import { Loader2, Sparkles } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type { ChatSession } from '../../../types/ai';

interface ChatInterfaceProps {
  session: ChatSession | undefined;
  isLoading: boolean;
  onSendMessage: (message: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  session,
  isLoading,
  onSendMessage,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [session?.messages]);

  // Empty state
  if (!session) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center max-w-md px-4">
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-blue-500" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to AI Chat
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start a conversation with any of our 5 AI providers: Claude, GitHub Copilot, Amazon Q,
            Google Gemini, or OpenAI Codex.
          </p>
          <div className="grid grid-cols-2 gap-3 text-left">
            {[
              { icon: '🚀', text: 'Code generation and debugging' },
              { icon: '💡', text: 'Technical explanations' },
              { icon: '📝', text: 'Documentation writing' },
              { icon: '🔍', text: 'Code review and optimization' },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                <span className="text-2xl mr-2">{feature.icon}</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Select a provider from the right panel and start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {session.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Using <span className="font-medium text-purple-600 dark:text-purple-400">{session.provider}</span>
              {' • '}
              {session.messages.length} message{session.messages.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              Connected
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {session.messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400">
                Start the conversation by typing a message below
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {session.messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 mb-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
                <Card className="flex-1 max-w-3xl">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </Card>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <ChatInput onSend={onSendMessage} isLoading={isLoading} />
    </div>
  );
};
