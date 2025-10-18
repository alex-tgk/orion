import { Test, TestingModule } from '@nestjs/testing';
import { SentryService } from '../sentry.service';
import * as Sentry from '@sentry/node';

// Mock Sentry
jest.mock('@sentry/node');

describe('SentryService', () => {
  let service: SentryService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SentryService],
    }).compile();

    service = module.get<SentryService>(SentryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('captureException', () => {
    it('should capture exception with context', () => {
      const error = new Error('Test error');
      const context = {
        user: { id: '123', email: 'test@example.com' },
        tags: { component: 'UserService' },
        extra: { userId: '123' },
      };

      const mockCaptureException = jest.spyOn(Sentry, 'captureException');
      mockCaptureException.mockReturnValue('event-id-123');

      const eventId = service.captureException(error, context);

      expect(mockCaptureException).toHaveBeenCalledWith(error, {
        user: context.user,
        tags: context.tags,
        extra: context.extra,
        level: undefined,
        fingerprint: undefined,
      });
      expect(eventId).toBe('event-id-123');
    });

    it('should capture exception without context', () => {
      const error = new Error('Test error');
      const mockCaptureException = jest.spyOn(Sentry, 'captureException');

      service.captureException(error);

      expect(mockCaptureException).toHaveBeenCalledWith(error, {
        user: undefined,
        tags: undefined,
        extra: undefined,
        level: undefined,
        fingerprint: undefined,
      });
    });
  });

  describe('captureMessage', () => {
    it('should capture message with level and context', () => {
      const message = 'Test message';
      const level = 'warning' as Sentry.SeverityLevel;
      const context = {
        tags: { feature: 'auth' },
      };

      const mockCaptureMessage = jest.spyOn(Sentry, 'captureMessage');
      mockCaptureMessage.mockReturnValue('event-id-456');

      const eventId = service.captureMessage(message, level, context);

      expect(mockCaptureMessage).toHaveBeenCalledWith(message, {
        level,
        user: undefined,
        tags: context.tags,
        extra: undefined,
        fingerprint: undefined,
      });
      expect(eventId).toBe('event-id-456');
    });

    it('should use default info level', () => {
      const mockCaptureMessage = jest.spyOn(Sentry, 'captureMessage');

      service.captureMessage('Test message');

      expect(mockCaptureMessage).toHaveBeenCalledWith('Test message', {
        level: 'info',
        user: undefined,
        tags: undefined,
        extra: undefined,
        fingerprint: undefined,
      });
    });
  });

  describe('setUser', () => {
    it('should set user context', () => {
      const user = { id: '123', email: 'test@example.com', username: 'testuser' };
      const mockSetUser = jest.spyOn(Sentry, 'setUser');

      service.setUser(user);

      expect(mockSetUser).toHaveBeenCalledWith(user);
    });

    it('should clear user context with null', () => {
      const mockSetUser = jest.spyOn(Sentry, 'setUser');

      service.setUser(null);

      expect(mockSetUser).toHaveBeenCalledWith(null);
    });
  });

  describe('setTag', () => {
    it('should set a single tag', () => {
      const mockSetTag = jest.spyOn(Sentry, 'setTag');

      service.setTag('environment', 'production');

      expect(mockSetTag).toHaveBeenCalledWith('environment', 'production');
    });
  });

  describe('setTags', () => {
    it('should set multiple tags', () => {
      const tags = {
        environment: 'production',
        service: 'user-service',
      };
      const mockSetTags = jest.spyOn(Sentry, 'setTags');

      service.setTags(tags);

      expect(mockSetTags).toHaveBeenCalledWith(tags);
    });
  });

  describe('setExtra', () => {
    it('should set extra context', () => {
      const mockSetExtra = jest.spyOn(Sentry, 'setExtra');

      service.setExtra('requestId', '12345');

      expect(mockSetExtra).toHaveBeenCalledWith('requestId', '12345');
    });
  });

  describe('setContext', () => {
    it('should set named context', () => {
      const context = { version: '1.0.0', buildId: 'abc123' };
      const mockSetContext = jest.spyOn(Sentry, 'setContext');

      service.setContext('app', context);

      expect(mockSetContext).toHaveBeenCalledWith('app', context);
    });

    it('should clear context with null', () => {
      const mockSetContext = jest.spyOn(Sentry, 'setContext');

      service.setContext('app', null);

      expect(mockSetContext).toHaveBeenCalledWith('app', null);
    });
  });

  describe('addBreadcrumb', () => {
    it('should add breadcrumb', () => {
      const breadcrumb: Sentry.Breadcrumb = {
        message: 'User logged in',
        category: 'auth',
        level: 'info',
        data: { userId: '123' },
      };
      const mockAddBreadcrumb = jest.spyOn(Sentry, 'addBreadcrumb');

      service.addBreadcrumb(breadcrumb);

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(breadcrumb);
    });
  });

  describe('startTransaction', () => {
    it('should start a transaction', () => {
      const mockTransaction = {
        finish: jest.fn(),
        setStatus: jest.fn(),
      } as any;

      const mockStartTransaction = jest.spyOn(Sentry, 'startTransaction');
      mockStartTransaction.mockReturnValue(mockTransaction);

      const transaction = service.startTransaction('user.registration', 'http.request');

      expect(mockStartTransaction).toHaveBeenCalledWith({
        name: 'user.registration',
        op: 'http.request',
      });
      expect(transaction).toBe(mockTransaction);
    });
  });

  describe('withScope', () => {
    it('should execute callback with scope', () => {
      const mockScope = {} as Sentry.Scope;
      const callback = jest.fn();

      const mockWithScope = jest.spyOn(Sentry, 'withScope');
      mockWithScope.mockImplementation((cb) => cb(mockScope));

      service.withScope(callback);

      expect(mockWithScope).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(mockScope);
    });
  });

  describe('flush', () => {
    it('should flush pending events', async () => {
      const mockFlush = jest.spyOn(Sentry, 'flush');
      mockFlush.mockResolvedValue(true);

      const result = await service.flush(5000);

      expect(mockFlush).toHaveBeenCalledWith(5000);
      expect(result).toBe(true);
    });

    it('should flush with default timeout', async () => {
      const mockFlush = jest.spyOn(Sentry, 'flush');
      mockFlush.mockResolvedValue(true);

      await service.flush();

      expect(mockFlush).toHaveBeenCalledWith(undefined);
    });
  });

  describe('close', () => {
    it('should close Sentry connection', async () => {
      const mockClose = jest.spyOn(Sentry, 'close');
      mockClose.mockResolvedValue(true);

      const result = await service.close(2000);

      expect(mockClose).toHaveBeenCalledWith(2000);
      expect(result).toBe(true);
    });
  });
});
