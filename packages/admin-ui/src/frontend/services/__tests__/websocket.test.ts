import { WebSocketService } from '../websocket';
import { io, Socket } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');

describe('WebSocketService', () => {
  let mockSocket: Partial<Socket>;
  let service: WebSocketService;

  beforeEach(() => {
    mockSocket = {
      connected: false,
      disconnected: true,
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };

    (io as jest.Mock).mockReturnValue(mockSocket);
    service = new WebSocketService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should create socket connection', () => {
      service.connect();

      expect(io).toHaveBeenCalledWith(
        window.location.origin,
        expect.objectContaining({
          reconnection: true,
          transports: ['websocket', 'polling'],
        })
      );
    });

    it('should not create duplicate connections', () => {
      mockSocket.connected = true;
      service.connect();
      service.connect();

      expect(io).toHaveBeenCalledTimes(1);
    });

    it('should setup event handlers on connect', () => {
      service.connect();

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('disconnect', () => {
    it('should disconnect socket', () => {
      service.connect();
      service.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnecting when not connected', () => {
      expect(() => service.disconnect()).not.toThrow();
    });
  });

  describe('on', () => {
    beforeEach(() => {
      service.connect();
    });

    it('should register event listener', () => {
      const callback = jest.fn();
      service.on('test-event', callback);

      expect(mockSocket.on).toHaveBeenCalledWith('test-event', expect.any(Function));
    });

    it('should call callback when event is received', () => {
      const callback = jest.fn();
      service.on('test-event', callback);

      // Simulate socket receiving event
      const eventHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'test-event'
      )?.[1];

      eventHandler?.({ data: 'test' });

      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should support multiple listeners for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      service.on('test-event', callback1);
      service.on('test-event', callback2);

      const eventHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'test-event'
      )?.[1];

      eventHandler?.({ data: 'test' });

      expect(callback1).toHaveBeenCalledWith({ data: 'test' });
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = service.on('test-event', callback);

      expect(typeof unsubscribe).toBe('function');

      unsubscribe();

      expect(mockSocket.off).toHaveBeenCalledWith('test-event');
    });
  });

  describe('emit', () => {
    it('should emit event when connected', () => {
      mockSocket.connected = true;
      service.connect();

      service.emit('test-event', { data: 'test' });

      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
    });

    it('should warn when emitting while disconnected', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      service.connect();
      mockSocket.connected = false;

      service.emit('test-event', { data: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket not connected')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('status', () => {
    it('should return disconnected when socket is null', () => {
      expect(service.status).toBe('disconnected');
    });

    it('should return connected when socket is connected', () => {
      mockSocket.connected = true;
      mockSocket.disconnected = false;
      service.connect();

      expect(service.status).toBe('connected');
    });

    it('should return disconnected when socket is disconnected', () => {
      mockSocket.connected = false;
      mockSocket.disconnected = true;
      service.connect();

      expect(service.status).toBe('disconnected');
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(service.isConnected).toBe(false);
    });

    it('should return true when connected', () => {
      mockSocket.connected = true;
      service.connect();

      expect(service.isConnected).toBe(true);
    });
  });

  describe('lifecycle callbacks', () => {
    it('should call onConnect when socket connects', () => {
      const onConnect = jest.fn();
      service = new WebSocketService({ onConnect });
      service.connect();

      const connectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      connectHandler?.();

      expect(onConnect).toHaveBeenCalled();
    });

    it('should call onDisconnect when socket disconnects', () => {
      const onDisconnect = jest.fn();
      service = new WebSocketService({ onDisconnect });
      service.connect();

      const disconnectHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];

      disconnectHandler?.('transport close');

      expect(onDisconnect).toHaveBeenCalled();
    });

    it('should call onError on connection error', () => {
      const onError = jest.fn();
      service = new WebSocketService({ onError });
      service.connect();

      const errorHandler = (mockSocket.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1];

      const testError = new Error('Connection failed');
      errorHandler?.(testError);

      expect(onError).toHaveBeenCalledWith(testError);
    });
  });
});
