import { SystemStatus, ActivityEntry } from '../types';

/**
 * API Service - Handles all communication with the backend
 */
class ApiService {
  private baseUrl: string;

  constructor() {
    // In production, this will be served from the same origin
    this.baseUrl = window.location.origin;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<{ status: string; timestamp: string }> {
    return this.fetch('/api/health');
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    return this.fetch('/api/system/status');
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit = 10): Promise<ActivityEntry[]> {
    return this.fetch(`/api/activity?limit=${limit}`);
  }

  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<{
    totalUsers: number;
    activeServices: number;
    requestsToday: number;
    avgResponseTime: number;
  }> {
    return this.fetch('/api/stats');
  }

  /**
   * Get all microservices status
   */
  async getServices(): Promise<Array<{
    id: string;
    name: string;
    status: 'running' | 'stopped' | 'error' | 'starting';
    uptime: number;
    health: 'healthy' | 'degraded' | 'down';
    lastCheck: Date;
    version?: string;
    url?: string;
  }>> {
    return this.fetch('/api/services');
  }
}

// Export singleton instance
export const API = new ApiService();
