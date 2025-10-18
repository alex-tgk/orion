import { renderHook, act, waitFor } from '@testing-library/react';
import { useServiceHealth } from '../useServiceHealth';
import { useWebSocket } from '../useWebSocket';
import { API } from '../../services/api';
import { ServiceHealth } from '../../types';

jest.mock('../useWebSocket');
jest.mock('../../services/api');

describe('useServiceHealth', () => {
  const mockUseWebSocket = useWebSocket as jest.MockedFunction<typeof useWebSocket>;
  const mockAPI = API as jest.Mocked<typeof API>;

  const mockServices: ServiceHealth[] = [
    {
      id: 'service-1',
      name: 'Auth Service',
      status: 'running',
      health: 'healthy',
      uptime: 3600,
      lastCheck: new Date(),
    },
    {
      id: 'service-2',
      name: 'API Gateway',
      status: 'running',
      health: 'healthy',
      uptime: 7200,
      lastCheck: new Date(),
    },
  ];

  let mockSubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSubscribe = jest.fn().mockReturnValue(() => {});

    mockUseWebSocket.mockReturnValue({
      status: 'connected',
      isConnected: true,
      emit: jest.fn(),
      subscribe: mockSubscribe,
    });

    mockAPI.getServices = jest.fn().mockResolvedValue(mockServices);
  });

  it('should fetch services on mount', async () => {
    const { result } = renderHook(() => useServiceHealth());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockAPI.getServices).toHaveBeenCalled();
    expect(result.current.services).toEqual(mockServices);
  });

  it('should handle fetch errors', async () => {
    const error = new Error('Fetch failed');
    mockAPI.getServices = jest.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useServiceHealth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toEqual(error);
  });

  it('should subscribe to service health updates when connected', async () => {
    const { result } = renderHook(() => useServiceHealth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSubscribe).toHaveBeenCalledWith('service:health', expect.any(Function));
  });

  it('should update services on WebSocket message', async () => {
    const { result } = renderHook(() => useServiceHealth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Get the callback passed to subscribe
    const callback = mockSubscribe.mock.calls[0][1];

    const updatedService: ServiceHealth = {
      id: 'service-1',
      name: 'Auth Service',
      status: 'running',
      health: 'degraded',
      uptime: 3700,
      lastCheck: new Date(),
    };

    act(() => {
      callback(updatedService);
    });

    await waitFor(() => {
      const service = result.current.services.find(s => s.id === 'service-1');
      expect(service?.health).toBe('degraded');
    });
  });

  it('should filter by serviceId when provided', async () => {
    const { result } = renderHook(() => useServiceHealth('service-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.services).toHaveLength(1);
    expect(result.current.service?.id).toBe('service-1');
  });

  it('should add new services from WebSocket updates', async () => {
    const { result } = renderHook(() => useServiceHealth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const callback = mockSubscribe.mock.calls[0][1];

    const newService: ServiceHealth = {
      id: 'service-3',
      name: 'New Service',
      status: 'running',
      health: 'healthy',
      uptime: 100,
      lastCheck: new Date(),
    };

    act(() => {
      callback(newService);
    });

    await waitFor(() => {
      expect(result.current.services).toHaveLength(3);
    });
  });

  it('should not subscribe when not connected', () => {
    mockUseWebSocket.mockReturnValue({
      status: 'disconnected',
      isConnected: false,
      emit: jest.fn(),
      subscribe: mockSubscribe,
    });

    renderHook(() => useServiceHealth());

    expect(mockSubscribe).not.toHaveBeenCalled();
  });
});
