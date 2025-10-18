import { ErrorClassifier } from './error-classifier';
import { AppError } from './app-error';
import { ErrorSeverity, ErrorCategory } from './error-severity.enum';

describe('ErrorClassifier', () => {
  const mockContext = {
    service: 'test-service',
    correlationId: 'test-correlation-id',
  };

  describe('classify', () => {
    it('should classify database connection errors as CRITICAL', () => {
      const error = new Error('Database connection failed');
      const appError = ErrorClassifier.classify(error, mockContext);

      expect(appError.severity).toBe(ErrorSeverity.CRITICAL);
      expect(appError.category).toBe(ErrorCategory.DATABASE);
      expect(appError.statusCode).toBe(503);
    });

    it('should classify authentication errors as HIGH', () => {
      const error = new Error('Authentication failed');
      const appError = ErrorClassifier.classify(error, mockContext);

      expect(appError.severity).toBe(ErrorSeverity.HIGH);
      expect(appError.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(appError.statusCode).toBe(401);
    });

    it('should classify validation errors as LOW', () => {
      const error = new Error('Validation failed: invalid email');
      const appError = ErrorClassifier.classify(error, mockContext);

      expect(appError.severity).toBe(ErrorSeverity.LOW);
      expect(appError.category).toBe(ErrorCategory.VALIDATION);
      expect(appError.statusCode).toBe(400);
    });

    it('should classify network errors as HIGH', () => {
      const error = new Error('Network error: connection timeout');
      const appError = ErrorClassifier.classify(error, mockContext);

      expect(appError.severity).toBe(ErrorSeverity.HIGH);
      expect(appError.category).toBe(ErrorCategory.NETWORK);
      expect(appError.statusCode).toBe(503);
    });

    it('should return AppError as-is if already classified', () => {
      const existingError = new AppError(
        'Test error',
        500,
        ErrorSeverity.HIGH,
        ErrorCategory.INTERNAL,
        mockContext
      );

      const result = ErrorClassifier.classify(existingError, mockContext);
      expect(result).toBe(existingError);
    });

    it('should classify unknown errors with default values', () => {
      const error = new Error('Some random error');
      const appError = ErrorClassifier.classify(error, mockContext);

      expect(appError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(appError.category).toBe(ErrorCategory.UNKNOWN);
      expect(appError.statusCode).toBe(500);
    });
  });

  describe('classifyByStatusCode', () => {
    it('should classify 5xx errors as HIGH/INTERNAL', () => {
      const appError = ErrorClassifier.classifyByStatusCode(
        500,
        'Internal server error',
        mockContext
      );

      expect(appError.severity).toBe(ErrorSeverity.HIGH);
      expect(appError.category).toBe(ErrorCategory.INTERNAL);
    });

    it('should classify 429 as MEDIUM/RATE_LIMIT', () => {
      const appError = ErrorClassifier.classifyByStatusCode(
        429,
        'Too many requests',
        mockContext
      );

      expect(appError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(appError.category).toBe(ErrorCategory.RATE_LIMIT);
    });

    it('should classify 401 as MEDIUM/AUTHENTICATION', () => {
      const appError = ErrorClassifier.classifyByStatusCode(
        401,
        'Unauthorized',
        mockContext
      );

      expect(appError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(appError.category).toBe(ErrorCategory.AUTHENTICATION);
    });

    it('should classify 403 as MEDIUM/AUTHORIZATION', () => {
      const appError = ErrorClassifier.classifyByStatusCode(
        403,
        'Forbidden',
        mockContext
      );

      expect(appError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(appError.category).toBe(ErrorCategory.AUTHORIZATION);
    });

    it('should classify 404 as LOW/BUSINESS_LOGIC', () => {
      const appError = ErrorClassifier.classifyByStatusCode(
        404,
        'Not found',
        mockContext
      );

      expect(appError.severity).toBe(ErrorSeverity.LOW);
      expect(appError.category).toBe(ErrorCategory.BUSINESS_LOGIC);
    });

    it('should classify 4xx errors as LOW/VALIDATION', () => {
      const appError = ErrorClassifier.classifyByStatusCode(
        400,
        'Bad request',
        mockContext
      );

      expect(appError.severity).toBe(ErrorSeverity.LOW);
      expect(appError.category).toBe(ErrorCategory.VALIDATION);
    });
  });

  describe('areDuplicates', () => {
    it('should identify duplicate errors with same signature', () => {
      const error1 = new AppError(
        'Database connection failed',
        503,
        ErrorSeverity.CRITICAL,
        ErrorCategory.DATABASE,
        mockContext
      );

      const error2 = new AppError(
        'Database connection failed',
        503,
        ErrorSeverity.CRITICAL,
        ErrorCategory.DATABASE,
        mockContext
      );

      expect(ErrorClassifier.areDuplicates(error1, error2)).toBe(true);
    });

    it('should not identify different errors as duplicates', () => {
      const error1 = new AppError(
        'Database connection failed',
        503,
        ErrorSeverity.CRITICAL,
        ErrorCategory.DATABASE,
        mockContext
      );

      const error2 = new AppError(
        'Authentication failed',
        401,
        ErrorSeverity.HIGH,
        ErrorCategory.AUTHENTICATION,
        mockContext
      );

      expect(ErrorClassifier.areDuplicates(error1, error2)).toBe(false);
    });
  });

  describe('isRecent', () => {
    it('should identify recent errors', () => {
      const error = new AppError(
        'Test error',
        500,
        ErrorSeverity.HIGH,
        ErrorCategory.INTERNAL,
        mockContext
      );

      expect(ErrorClassifier.isRecent(error, 1000000)).toBe(true);
    });

    it('should identify old errors', () => {
      const error = new AppError(
        'Test error',
        500,
        ErrorSeverity.HIGH,
        ErrorCategory.INTERNAL,
        {
          ...mockContext,
          timestamp: new Date(Date.now() - 4000000), // 4 seconds ago
        }
      );

      expect(ErrorClassifier.isRecent(error, 1000)).toBe(false);
    });
  });
});
