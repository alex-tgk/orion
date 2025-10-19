import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '../services/api';
import type {
  Queue,
  QueueListResponse,
  QueueMessagesResponse,
  PurgeQueueResponse,
  QueueStatsUpdate,
} from '../types/queue.types';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3004';

export function useQueues() {
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);

  // Fetch all queues
  const {
    data: queuesData,
    isLoading,
    error,
    refetch,
  } = useQuery<QueueListResponse>({
    queryKey: ['queues'],
    queryFn: () => api.get<QueueListResponse>('/queues'),
    refetchInterval: 5000, // Fallback polling
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      path: '/admin',
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to admin WebSocket');
    });

    newSocket.on('queue-stats', (update: QueueStatsUpdate) => {
      queryClient.setQueryData<QueueListResponse>(
        ['queues'],
        (old) => {
          if (!old) return old;

          const updatedQueues = old.queues.map((queue) =>
            queue.name === update.queueName
              ? { ...queue, stats: update.stats }
              : queue
          );

          return {
            ...old,
            queues: updatedQueues,
            timestamp: update.timestamp,
          };
        }
      );
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from admin WebSocket');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [queryClient]);

  const queues = queuesData?.queues || [];
  const totalMessages = queuesData?.totalMessages || 0;

  return {
    queues,
    totalMessages,
    isLoading,
    error,
    refetch,
    isConnected: socket?.connected || false,
  };
}

export function useQueueMessages(queueName: string | null) {
  return useQuery<QueueMessagesResponse>({
    queryKey: ['queue-messages', queueName],
    queryFn: () => api.get<QueueMessagesResponse>(`/queues/${queueName}/messages`),
    enabled: !!queueName,
    refetchOnWindowFocus: false,
  });
}

export function useQueueDetails(queueName: string | null) {
  return useQuery<Queue>({
    queryKey: ['queue', queueName],
    queryFn: () => api.get<Queue>(`/queues/${queueName}`),
    enabled: !!queueName,
  });
}

export function usePurgeQueue() {
  const queryClient = useQueryClient();

  return useMutation<PurgeQueueResponse, Error, string>({
    mutationFn: (queueName: string) =>
      api.post<PurgeQueueResponse>(`/queues/${queueName}/purge`),
    onSuccess: (data) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      queryClient.invalidateQueries({ queryKey: ['queue', data.queueName] });
      queryClient.invalidateQueries({ queryKey: ['queue-messages', data.queueName] });
    },
  });
}

export function useQueueStats(queueName: string | null) {
  const [historicalStats, setHistoricalStats] = useState<Array<{
    timestamp: string;
    messageCount: number;
    publishRate: number;
    deliveryRate: number;
    consumerCount: number;
  }>>([]);

  const { data: queueData } = useQueueDetails(queueName);

  useEffect(() => {
    if (!queueData) return;

    setHistoricalStats((prev) => {
      const newEntry = {
        timestamp: new Date().toISOString(),
        messageCount: queueData.stats.messageCount,
        publishRate: queueData.stats.publishRate || 0,
        deliveryRate: queueData.stats.deliveryRate || 0,
        consumerCount: queueData.stats.consumerCount,
      };

      // Keep last 20 data points
      const updated = [...prev, newEntry];
      return updated.slice(-20);
    });
  }, [queueData]);

  return {
    stats: queueData?.stats,
    historicalStats,
  };
}
