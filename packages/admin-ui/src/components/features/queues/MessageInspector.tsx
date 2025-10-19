import { useState, useEffect } from 'react';
import { Card, Badge, Button } from '@tremor/react';
import { X, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { useQueueMessages } from '../../../hooks/useQueues';
import type { QueueMessage } from '../../../types/queue.types';

interface MessageInspectorProps {
  queueName: string | null;
  onClose: () => void;
}

export function MessageInspector({ queueName, onClose }: MessageInspectorProps) {
  const { data, isLoading, error } = useQueueMessages(queueName);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [queueName]);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!queueName) {
    return null;
  }

  const messages = data?.messages || [];
  const currentMessage = messages[selectedIndex];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold">Message Inspector</h3>
              <p className="text-sm text-gray-600">Queue: {queueName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Loading / Error States */}
          {isLoading && (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading messages...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">Failed to load messages</p>
              <p className="text-sm text-gray-500 mt-2">{error.message}</p>
            </div>
          )}

          {!isLoading && !error && messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600">No messages in queue</p>
            </div>
          )}

          {/* Message Navigation */}
          {messages.length > 0 && (
            <>
              <div className="flex items-center justify-between py-2">
                <div className="text-sm text-gray-600">
                  Message {selectedIndex + 1} of {messages.length}
                  {data && (
                    <span className="ml-2 text-gray-500">
                      ({data.totalInQueue} total in queue)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
                    disabled={selectedIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => setSelectedIndex((i) => Math.min(messages.length - 1, i + 1))}
                    disabled={selectedIndex === messages.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Message Details */}
              {currentMessage && (
                <div className="space-y-4">
                  {/* Properties */}
                  {currentMessage.properties && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm">Properties</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {currentMessage.properties.contentType && (
                          <div>
                            <span className="text-gray-600">Content Type:</span>
                            <Badge color="blue" className="ml-2">
                              {currentMessage.properties.contentType}
                            </Badge>
                          </div>
                        )}
                        {currentMessage.properties.deliveryMode !== undefined && (
                          <div>
                            <span className="text-gray-600">Delivery Mode:</span>
                            <Badge color="gray" className="ml-2">
                              {currentMessage.properties.deliveryMode === 2 ? 'Persistent' : 'Non-persistent'}
                            </Badge>
                          </div>
                        )}
                        {currentMessage.properties.priority !== undefined && (
                          <div>
                            <span className="text-gray-600">Priority:</span>
                            <span className="ml-2 font-medium">{currentMessage.properties.priority}</span>
                          </div>
                        )}
                        {currentMessage.properties.timestamp && (
                          <div>
                            <span className="text-gray-600">Timestamp:</span>
                            <span className="ml-2 font-medium">
                              {new Date(currentMessage.properties.timestamp).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {currentMessage.properties.correlationId && (
                          <div className="col-span-2">
                            <span className="text-gray-600">Correlation ID:</span>
                            <code className="ml-2 text-xs bg-white px-2 py-1 rounded">
                              {currentMessage.properties.correlationId}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Fields */}
                  {currentMessage.fields && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-sm mb-3">Fields</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {currentMessage.fields.exchange && (
                          <div>
                            <span className="text-gray-600">Exchange:</span>
                            <code className="ml-2 text-xs bg-white px-2 py-1 rounded">
                              {currentMessage.fields.exchange}
                            </code>
                          </div>
                        )}
                        {currentMessage.fields.routingKey && (
                          <div>
                            <span className="text-gray-600">Routing Key:</span>
                            <code className="ml-2 text-xs bg-white px-2 py-1 rounded">
                              {currentMessage.fields.routingKey}
                            </code>
                          </div>
                        )}
                        {currentMessage.fields.redelivered !== undefined && (
                          <div>
                            <span className="text-gray-600">Redelivered:</span>
                            <Badge color={currentMessage.fields.redelivered ? 'yellow' : 'green'} className="ml-2">
                              {currentMessage.fields.redelivered ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Message Body */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm">Message Body</h4>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(currentMessage.content, null, 2), 'body')}
                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        {copiedField === 'body' ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-green-600" />
                            <span className="text-green-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="bg-white p-3 rounded border border-gray-200 overflow-x-auto text-xs">
                      {JSON.stringify(currentMessage.content, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
