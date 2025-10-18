import { io, Socket } from 'socket.io-client';

export interface WebSocketTestClientOptions {
  port?: number;
  namespace?: string;
  auth?: Record<string, any>;
}

/**
 * WebSocket test client for testing Socket.IO connections
 */
export class WebSocketTestClient {
  private socket: Socket | null = null;
  private receivedMessages: any[] = [];
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(private options: WebSocketTestClientOptions = {}) {}

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    const port = this.options.port || 3000;
    const namespace = this.options.namespace || '';
    const url = `http://localhost:${port}${namespace}`;

    return new Promise((resolve, reject) => {
      this.socket = io(url, {
        auth: this.options.auth,
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        reject(error);
      });

      // Capture all messages
      this.socket.onAny((event, ...args) => {
        this.receivedMessages.push({ event, args });

        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          handlers.forEach(handler => handler(...args));
        }
      });
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Emit event to server
   */
  emit(event: string, data?: any): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit(event, data);
  }

  /**
   * Emit event and wait for response
   */
  async emitWithAck(event: string, data?: any, timeout = 5000): Promise<any> {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Acknowledgment timeout for event: ${event}`));
      }, timeout);

      this.socket!.emit(event, data, (response: any) => {
        clearTimeout(timer);
        resolve(response);
      });
    });
  }

  /**
   * Register event handler
   */
  on(event: string, handler: (...args: any[]) => void): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }

  /**
   * Wait for specific event
   */
  async waitForEvent(event: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      this.on(event, (...args) => {
        clearTimeout(timer);
        resolve(args.length === 1 ? args[0] : args);
      });
    });
  }

  /**
   * Get all received messages
   */
  getReceivedMessages(): any[] {
    return this.receivedMessages;
  }

  /**
   * Clear received messages
   */
  clearMessages(): void {
    this.receivedMessages = [];
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}
