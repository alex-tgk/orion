/**
 * ChatHistory Component
 * Sidebar showing past chat sessions with search and delete
 */

import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Download,
  X,
} from 'lucide-react';
import { Button, TextInput } from '@tremor/react';
import type { ChatSession, AIProvider } from '../../../types/ai';

interface ChatHistoryProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: (provider: AIProvider) => void;
  onDeleteSession: (sessionId: string) => void;
  onExportSession: (sessionId: string) => string;
  onClearAll: () => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onExportSession,
  onClearAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter sessions based on search
  const filteredSessions = sessions.filter(
    (session) =>
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.messages.some((msg) =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const handleExport = (sessionId: string, title: string) => {
    const markdown = onExportSession(sessionId);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Chat History
          </h2>
          <Button
            onClick={() => onCreateSession('claude')}
            size="xs"
            color="blue"
            icon={Plus}
          >
            New
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <TextInput
            icon={Search}
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No chats found' : 'No chat history yet'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => onCreateSession('claude')}
                size="sm"
                color="blue"
                className="mt-3"
              >
                Start a new chat
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`group relative p-3 cursor-pointer transition-colors ${
                  activeSessionId === session.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                {/* Session Info */}
                <div className="mb-1">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate pr-16">
                    {session.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                      {session.provider}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {session.messages.length} messages
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatDate(session.updatedAt)}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(session.id, session.title);
                    }}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    title="Export as markdown"
                  >
                    <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          `Delete "${session.title}"? This cannot be undone.`
                        )
                      ) {
                        onDeleteSession(session.id);
                      }
                    }}
                    className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20"
                    title="Delete session"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {sessions.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={() => {
              if (
                window.confirm(
                  'Clear all chat history? This cannot be undone.'
                )
              ) {
                onClearAll();
              }
            }}
            size="sm"
            variant="secondary"
            color="red"
            icon={Trash2}
            className="w-full"
          >
            Clear All History
          </Button>
        </div>
      )}
    </div>
  );
};
