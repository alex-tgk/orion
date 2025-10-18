import { useState } from 'react';
import { X, Send, Bot } from 'lucide-react';
import { chatApi } from '../../services/api';
import type { ChatMessage } from '../../types';

interface ChatModalProps {
  documentId: string;
  onClose: () => void;
}

export function ChatModal({ documentId, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);

    try {
      const response = await chatApi.askQuestion(documentId, question);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toISOString(),
        sources: response.sources,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">AI Q&A</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Bot className="h-12 w-12 mx-auto mb-3" />
              <p>Ask anything about this document</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
              <div className={msg.role === 'user' ? 'inline-block bg-primary text-white rounded-lg p-3' : 'inline-block bg-gray-100 rounded-lg p-3'}>
                <p className="text-sm">{msg.content}</p>
                {msg.sources && (
                  <div className="mt-2 text-xs">
                    {msg.sources.map((s, i) => (
                      <div key={i} className="mt-1">Page {s.page}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
              placeholder="Ask a question..."
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button onClick={handleAsk} className="px-4 py-2 bg-primary text-white rounded-lg">
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
