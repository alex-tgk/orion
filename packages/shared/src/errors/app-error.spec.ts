import { AppError } from './app-error';
import { ErrorSeverity, ErrorCategory } from './error-severity.enum';

describe('AppError', () => {
  const mockContext = {
    service: 'test-service',
    correlationId: 'test-correlation-id',
    userId: 'user-123',
    path: '/api/test',
    method: 'GET',
  };

  describe('constructor', () => {
    it('should create error with all properties', () => {
      const error = new AppError(
        'Test error message',
        500,
        ErrorSeverity.HIGH,
        ErrorCategory.INTERNAL,
        mockContext
      );

      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(500);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.category).toBe(ErrorCategory.INTERNAL);
      expect(error.isOperational).toBe(true);
      expect(error.context.service).toBe('test-service');
      expect(error.context.correlationId).toBe('test-correlation-id');
    });

    it('should generate error code', () => {
      const error = new AppError(
        'Test error',
        500,
        ErrorSeverity.HIGH,
        ErrorCategory.INTERNAL,
        mockContext
      );

      expect(error.code).toBeDefined();
      expect(error.code).toMatch(/^INT-H-/);
    });

    it('should use provided error code', () => {
      const error = new AppError(
        'Test error',
        500,
        ErrorSeverity.HIGH,
        ErrorCategory.INTERNAL,
        mockContext,
        true,
        'CUSTOM-CODE-123'
      );

      expect(error.code).toBe('CUSTOM-CODE-123');
    });

    it('should generate unique signature', () => {
      const error = new AppError(
        'Test error',
        500,
        ErrorSeverity.HIGH,
        ErrorCategory.INTERNAL,
        mockContext
      );

      expect(error.signature).toBeDefined();
      expect(error.signature).toHaveLength(64); // SHA-256 hex
    });

    it('should generate same signature for similar errors', () => {
      const error1 = new AppError(
        'Database connection failed with ID 123',
        503,
        ErrorSeverity.CRITICAL,
        ErrorCategory.DATABASE,
        mockContext
      );

      const error2 = new AppError(
        'Database connection failed with ID 456',
        503,
        ErrorSeverity.CRITICAL,
        ErrorCategory.DATABASE,
        mockContext
      );

      // Signatures should be same because numbers are normalized
      expect(error1.signature).toBe(error2.signature);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON without stack trace', () => {
      const error = new AppError(
        'Test error',
        500,
        ErrorSeverity.HIGH,
        ErrorCategory.INTERNAL,
        mockContext
      );

      const json = error.toJSON();

      expect(json.message).toBe('Test error');
      expect(json.statusCode).toBe(500);
      expect(json.severity).toBe(ErrorSeverity.HIGH);
      expect(json.category).toBe(ErrorCategory.INTERNAL);
      expect(json.context.stack).toBeUndefined();
    });
  });

  describe('shouldCreateIssue', () => {
    it('should create issue for CRITICAL operational errors', () => {
      const error = new AppError(
        'Test error',
        500,
        ErrorSeverity.CRITICAL,
        ErrorCategory.INTERNAL,
        mockContext
      );

      expect(error.shouldCreateIssue()).toBe(true);
    });

    it('should create issue for HIGH operational errors', () => {
      const error = new AppError(
        'Test error',
        500,
        ErrorSeverity.HIGH,
        ErrorCategory.INTERNAL,
        mockContext
      );

      expect(error.shouldCreateIssue()).toBe(true);
    });

    it('should not create issue for MEDIUM errors', () => {
      const error = new AppError(
        'Test error',
        400,
        ErrorSeverity.MEDIUM,
        ErrorCategory.VALIDATION,
        mockContext
      );

      expect(error.shouldCreateIssue()).toBe(false);
    });

    it('should not create issue for non-operational errors', () => {
      const error = new AppError(
        'Test error',
        500,
        ErrorSeverity.CRITICAL,
        ErrorCategory.INTERNAL,
        mockContext,
        false // non-operational
      );

      expect(error.shouldCreateIssue()).toBe(false);
    });
  });

  describe('getLogDetails', () => {
    it('should include stack trace in log details', () => {
      const error = new AppError(
        'Test error',
        500,
        ErrorSeverity.HIGH,
        ErrorCategory.INTERNAL,
        mockContext
      );

      const logDetails = error.getLogDetails();

      expect(logDetails.stack).toBeDefined();
      expect(logDetails.message).toBe('Test error');
    });
  });

  describe('instanceof checks', () => {
    it('should maintain proper prototype chain', () => {
      const error = new AppError(
        'Test error',
        500,
        ErrorSeverity.HIGH,
        ErrorCategory.INTERNAL,
        mockContext
      );

      expect(error instanceof AppError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });
});
