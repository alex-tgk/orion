import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';
import { websocketService } from '../../services/websocket';

jest.mock('../../services/websocket');

describe('useWebSocket', () => {
  const mockWebsocketService = websocketService as jest.Mocked<typeof websocketService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWebsocketService.status = 'disconnected';
    mockWebsocketService.connect = jest.fn();
    mockWebsocketService.emit = jest.fn();
    mockWebsocketService.on = jest.fn().mockReturnValue(() => {});
  });

  it('should connect on mount', () => {
    renderHook(() => useWebSocket());

    expect(mockWebsocketService.connect).toHaveBeenCalled();
  });

  it('should return connection status', async () => {
    mockWebsocketService.status = 'connected';

    const { result } = renderHook(() => useWebSocket());

    await waitFor(() => {
      expect(result.current.status).toBe('connected');
      expect(result.current.isConnected).toBe(true);
    });
  });

  it('should provide emit function', () => {
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.emit('test-event', { data: 'test' });
    });

    expect(mockWebsocketService.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
  });

  it('should provide subscribe function', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useWebSocket());

    act(() => {
      result.current.subscribe('test-event', callback);
    });

    expect(mockWebsocketService.on).toHaveBeenCalledWith('test-event', callback);
  });

  it('should update status periodically', async () => {
    mockWebsocketService.status = 'disconnected';

    const { result } = renderHook(() => useWebSocket());

    expect(result.current.status).toBe('disconnected');

    // Change status
    mockWebsocketService.status = 'connected';

    await waitFor(
      () => {
        expect(result.current.status).toBe('connected');
      },
      { timeout: 2000 }
    );
  });
});
