import { useState } from 'react';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../services/api';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['search', searchTerm],
    queryFn: () => searchApi.search(searchTerm),
    enabled: searchTerm.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(query);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Semantic Search</h1>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across all documents..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
          >
            Search
          </button>
        </div>
      </form>

      {isLoading && <div>Searching...</div>}

      {data && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{data.totalResults} results found</p>
          {data.results.map((result) => (
            <div key={result.documentId} className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold text-lg mb-2">{result.title}</h3>
              <p className="text-gray-600 text-sm mb-3">{result.snippet}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Score: {(result.score * 100).toFixed(0)}%</span>
                <span>{result.metadata.pages} pages</span>
                <span className="capitalize">{result.metadata.type}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
