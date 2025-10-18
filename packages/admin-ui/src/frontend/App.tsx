import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/AuthContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';

// Layout components
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { AuthLayout } from '@/components/layouts/AuthLayout';

// Page components
import { Dashboard } from '@/pages/Dashboard';
import { Services } from '@/pages/Services';
import { ServiceDetail } from '@/pages/ServiceDetail';
import { Users } from '@/pages/Users';
import { UserDetail } from '@/pages/UserDetail';
import { Metrics } from '@/pages/Metrics';
import { Events } from '@/pages/Events';
import { Logs } from '@/pages/Logs';
import { Configuration } from '@/pages/Configuration';
import { Settings } from '@/pages/Settings';
import { Login } from '@/pages/Login';
import { NotFound } from '@/pages/NotFound';

// Protected route component
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Main Application Component
 *
 * Sets up routing, providers, and global application structure.
 */
export function App() {
  useEffect(() => {
    // Set up global error handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });

    return () => {
      window.removeEventListener('unhandledrejection', () => {});
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="orion-admin-theme">
        <BrowserRouter basename="/admin">
          <AuthProvider>
            <WebSocketProvider>
              <Routes>
                {/* Public routes */}
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<Login />} />
                </Route>

                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<DashboardLayout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />

                    {/* Services */}
                    <Route path="/services" element={<Services />} />
                    <Route path="/services/:serviceName" element={<ServiceDetail />} />

                    {/* Users */}
                    <Route path="/users" element={<Users />} />
                    <Route path="/users/:userId" element={<UserDetail />} />

                    {/* Monitoring */}
                    <Route path="/metrics" element={<Metrics />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/logs" element={<Logs />} />

                    {/* Configuration */}
                    <Route path="/configuration" element={<Configuration />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>

              <Toaster />
            </WebSocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>

      {/* React Query Devtools */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

export default App;