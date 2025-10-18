import { API } from '../api';
import { SystemStatus, ActivityEntry } from '../../types';

describe('API Service', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe('getHealth', () => {
    it('should fetch health status', async () => {
      const mockResponse = { status: 'ok', timestamp: '2024-01-01T00:00:00Z' };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await API.getHealth();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/health'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('getSystemStatus', () => {
    it('should fetch system status', async () => {
      const mockStatus: SystemStatus = {
        status: 'healthy',
        uptime: 3600,
        services: [
          { name: 'Auth', status: 'running' },
          { name: 'API', status: 'running' },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockStatus,
      });

      const result = await API.getSystemStatus();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/system/status'),
        expect.anything()
      );

      expect(result).toEqual(mockStatus);
    });
  });

  describe('getRecentActivity', () => {
    it('should fetch recent activity with default limit', async () => {
      const mockActivity: ActivityEntry[] = [
        {
          id: '1',
          timestamp: new Date(),
          type: 'info',
          message: 'User logged in',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockActivity,
      });

      const result = await API.getRecentActivity();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/activity?limit=10'),
        expect.anything()
      );

      expect(result).toEqual(mockActivity);
    });

    it('should fetch recent activity with custom limit', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      await API.getRecentActivity(25);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/activity?limit=25'),
        expect.anything()
      );
    });
  });

  describe('getStats', () => {
    it('should fetch dashboard statistics', async () => {
      const mockStats = {
        totalUsers: 150,
        activeServices: 8,
        requestsToday: 5000,
        avgResponseTime: 125,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockStats,
      });

      const result = await API.getStats();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/stats'),
        expect.anything()
      );

      expect(result).toEqual(mockStats);
    });
  });

  describe('getServices', () => {
    it('should fetch all microservices status', async () => {
      const mockServices = [
        {
          id: 'auth',
          name: 'Auth Service',
          status: 'running' as const,
          uptime: 3600,
          health: 'healthy' as const,
          lastCheck: new Date(),
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockServices,
      });

      const result = await API.getServices();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/services'),
        expect.anything()
      );

      expect(result).toEqual(mockServices);
    });
  });

  describe('error handling', () => {
    it('should throw error on HTTP error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(API.getHealth()).rejects.toThrow('HTTP error! status: 500');
    });

    it('should throw error on network failure', async () => {
      const networkError = new Error('Network failure');
      (global.fetch as jest.Mock).mockRejectedValue(networkError);

      await expect(API.getHealth()).rejects.toThrow('Network failure');
    });

    it('should log errors to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Test error'));

      await expect(API.getHealth()).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('API Error'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('request configuration', () => {
    it('should use window.location.origin as base URL', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await API.getHealth();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(window.location.origin),
        expect.anything()
      );
    });

    it('should include Content-Type header', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await API.getHealth();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });
});
