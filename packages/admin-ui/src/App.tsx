import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Services } from './pages/Services';
import { Users } from './pages/Users';
import { FeatureFlags } from './pages/FeatureFlags';
import { Queues } from './pages/Queues';
import { Webhooks } from './pages/Webhooks';
import { Analytics } from './pages/Analytics';
import { Logs } from './pages/Logs';
import { Settings } from './pages/Settings';
import { AIChat } from './pages/AIChat';
import { Login } from './pages/Login';
import { useAuthStore } from './store/auth.store';

function App() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/services" element={<Services />} />
          <Route path="/users" element={<Users />} />
          <Route path="/feature-flags" element={<FeatureFlags />} />
          <Route path="/queues" element={<Queues />} />
          <Route path="/webhooks" element={<Webhooks />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/ai-chat" element={<AIChat />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
