/**
 * ChatInput Component
 * Auto-resizing textarea with send button and character count
 */

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

const MAX_CHARACTERS = 10000;
const MAX_ROWS = 10;

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  isLoading = false,
  placeholder = 'Type your message... (Shift+Enter for new line, Enter to send)',
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Calculate new height based on content
    const newHeight = Math.min(textarea.scrollHeight, MAX_ROWS * 24); // 24px per row
    textarea.style.height = `${newHeight}px`;
  }, [message]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled && !isLoading) {
      onSend(trimmed);
      setMessage('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const characterCount = message.length;
  const isOverLimit = characterCount > MAX_CHARACTERS;
  const showWarning = characterCount > MAX_CHARACTERS * 0.8;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Character count */}
        {showWarning && (
          <div className="mb-2 text-right">
            <span
              className={`text-xs ${
                isOverLimit
                  ? 'text-red-500 font-semibold'
                  : 'text-yellow-600 dark:text-yellow-500'
              }`}
            >
              {characterCount.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()} characters
            </span>
          </div>
        )}

        {/* Input area */}
        <div className="flex gap-2 items-end">
          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled || isLoading}
              placeholder={placeholder}
              className={`w-full px-4 py-3 rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white ${
                isOverLimit
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300'
              }`}
              rows={1}
              style={{
                minHeight: '48px',
                maxHeight: `${MAX_ROWS * 24}px`,
              }}
            />
          </div>

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={!message.trim() || disabled || isLoading || isOverLimit}
            className="h-12 px-6"
            color="blue"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Helper text */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">Enter</kbd> to
          send, <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">Shift+Enter</kbd> for
          new line
        </div>
      </div>
    </div>
  );
};
