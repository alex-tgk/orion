import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Flag {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  type: string;
  rolloutPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export const useFeatureFlags = () => {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/feature-flags`);
      if (!response.ok) {
        throw new Error('Failed to fetch feature flags');
      }
      const data = await response.json();
      setFlags(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchFlags();

    // Connect to WebSocket for real-time updates
    const ws = io(`${API_URL}/flags`);
    setSocket(ws);

    ws.on('connect', () => {
      console.log('Connected to flags WebSocket');
    });

    ws.on('flag:update', (data: { key: string; flag: Flag }) => {
      console.log('Flag updated:', data.key);
      setFlags((prevFlags) =>
        prevFlags.map((f) => (f.key === data.key ? data.flag : f))
      );
    });

    ws.on('flag:change', (data: { key: string; action: string }) => {
      console.log('Flag changed:', data.key, data.action);
      fetchFlags(); // Refetch all flags on any change
    });

    ws.on('disconnect', () => {
      console.log('Disconnected from flags WebSocket');
    });

    return () => {
      ws.disconnect();
    };
  }, [fetchFlags, API_URL]);

  const toggleFlag = async (key: string) => {
    try {
      const response = await fetch(`${API_URL}/feature-flags/${key}/toggle`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to toggle flag');
      }
      await fetchFlags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle flag');
      throw err;
    }
  };

  const deleteFlag = async (key: string) => {
    try {
      const response = await fetch(`${API_URL}/feature-flags/${key}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete flag');
      }
      await fetchFlags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete flag');
      throw err;
    }
  };

  const createFlag = async (flagData: Partial<Flag>) => {
    try {
      const response = await fetch(`${API_URL}/feature-flags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flagData),
      });
      if (!response.ok) {
        throw new Error('Failed to create flag');
      }
      await fetchFlags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create flag');
      throw err;
    }
  };

  return {
    flags,
    loading,
    error,
    toggleFlag,
    deleteFlag,
    createFlag,
    refreshFlags: fetchFlags,
    socket,
  };
};
