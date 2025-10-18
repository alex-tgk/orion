import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  SystemHealthOverview,
  ServiceHealth,
  ServiceDependencyGraph,
  HealthHistoryResponse,
  Alert,
} from '../types/health';

const API_BASE = '/api/health';

export const useSystemHealthOverview = (refreshInterval = 10000) => {
  return useQuery<SystemHealthOverview>({
    queryKey: ['health', 'overview'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/overview`);
      return data;
    },
    refetchInterval: refreshInterval,
  });
};

export const useAllServicesHealth = (refreshInterval = 10000) => {
  return useQuery<ServiceHealth[]>({
    queryKey: ['health', 'services'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/services`);
      return data;
    },
    refetchInterval: refreshInterval,
  });
};

export const useServiceHealth = (serviceName: string, refreshInterval = 10000) => {
  return useQuery<ServiceHealth>({
    queryKey: ['health', 'service', serviceName],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/services/${serviceName}`);
      return data;
    },
    refetchInterval: refreshInterval,
    enabled: !!serviceName,
  });
};

export const useServiceHealthHistory = (
  serviceName: string,
  timeRangeHours: number = 24
) => {
  return useQuery<HealthHistoryResponse>({
    queryKey: ['health', 'history', serviceName, timeRangeHours],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/history/${serviceName}`, {
        params: { timeRange: timeRangeHours },
      });
      return data;
    },
    enabled: !!serviceName,
  });
};

export const useServiceDependencyGraph = () => {
  return useQuery<ServiceDependencyGraph>({
    queryKey: ['health', 'dependencies'],
    queryFn: async () => {
      const { data} = await axios.get(`${API_BASE}/dependencies`);
      return data;
    },
  });
};

export const useAlerts = (severity?: string, status?: string, serviceName?: string) => {
  return useQuery<{ alerts: Alert[]; total: number; active: number; critical: number }>({
    queryKey: ['health', 'alerts', severity, status, serviceName],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/alerts`, {
        params: { severity, status, serviceName },
      });
      return data;
    },
    refetchInterval: 30000, // 30 seconds
  });
};

export const useAlertCounts = () => {
  return useQuery({
    queryKey: ['health', 'alerts', 'counts'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/alerts/counts`);
      return data;
    },
    refetchInterval: 10000,
  });
};
