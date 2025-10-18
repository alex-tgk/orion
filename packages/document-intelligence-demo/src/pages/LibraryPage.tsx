import { useQuery } from '@tanstack/react-query';
import { FileText, Eye, MessageSquare, Download } from 'lucide-react';
import { documentsApi } from '../services/api';
import { formatDate, formatBytes } from '../lib/utils';
import { useState } from 'react';
import { ChatModal } from '../components/chat/ChatModal';

export function LibraryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.getAll(),
  });

  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const documents = data?.documents || [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Document Library</h1>
        <p className="mt-2 text-gray-600">
          {documents.length} documents processed and ready for AI-powered Q&A
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((doc) => (
          <div key={doc.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{doc.title}</h3>
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                  {doc.type}
                </span>
              </div>
              <FileText className="h-5 w-5 text-gray-400" />
            </div>

            <p className="text-sm text-gray-600 mb-4 line-clamp-3">{doc.summary}</p>

            {doc.entities && (
              <div className="mb-4 space-y-2">
                {doc.entities.people.length > 0 && (
                  <div className="text-xs">
                    <span className="font-medium text-gray-700">People: </span>
                    <span className="text-gray-600">{doc.entities.people.join(', ')}</span>
                  </div>
                )}
                {doc.entities.amounts.length > 0 && (
                  <div className="text-xs">
                    <span className="font-medium text-gray-700">Amounts: </span>
                    <span className="text-gray-600">{doc.entities.amounts.join(', ')}</span>
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-gray-500 mb-4">
              {doc.metadata.pages} pages • {formatBytes(doc.metadata.fileSize)} • {formatDate(doc.metadata.uploadedAt)}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedDoc(doc.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium"
              >
                <MessageSquare className="h-4 w-4" />
                Ask AI
              </button>
              <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedDoc && (
        <ChatModal documentId={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}
    </div>
  );
}
