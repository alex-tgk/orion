import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { FileText, Upload, Search, BarChart, Brain } from 'lucide-react';
import { cn } from './lib/utils';

// Pages
import { LibraryPage } from './pages/LibraryPage';
import { UploadPage } from './pages/UploadPage';
import { SearchPage } from './pages/SearchPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

const navigation = [
  { name: 'Library', href: '/', icon: FileText },
  { name: 'Upload', href: '/upload', icon: Upload },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Analytics', href: '/analytics', icon: BarChart },
];

function Navigation() {
  const location = useLocation();

  return (
    <nav className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <Brain className="h-6 w-6 text-primary mr-2" />
        <h1 className="text-lg font-bold text-primary">Document AI</h1>
      </div>
      <div className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p className="font-semibold mb-1">Powered by ORION</p>
          <p>8 microservices integrated</p>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        <Navigation />
        <main className="flex-1 overflow-y-auto p-8">
          <Routes>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
