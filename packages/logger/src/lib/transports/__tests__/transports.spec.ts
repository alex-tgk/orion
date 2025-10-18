import * as winston from 'winston';
import { createConsoleTransport } from '../console.transport';
import { createFileTransports } from '../file.transport';
import type { LoggerConfig } from '../../interfaces/logger-options.interface';

describe('Transports', () => {
  describe('Console Transport', () => {
    it('should create console transport', () => {
      const transport = createConsoleTransport(false, 'info');
      expect(transport).toBeDefined();
      expect(transport).toBeInstanceOf(winston.transports.Console);
    });

    it('should respect log level', () => {
      const transport = createConsoleTransport(false, 'debug');
      expect(transport.level).toBe('debug');
    });

    it('should handle pretty mode', () => {
      const prettyTransport = createConsoleTransport(true, 'info');
      const jsonTransport = createConsoleTransport(false, 'info');

      expect(prettyTransport).toBeDefined();
      expect(jsonTransport).toBeDefined();
    });
  });

  describe('File Transports', () => {
    it('should return empty array without file options', () => {
      const config: LoggerConfig = {
        serviceName: 'test',
      };

      const transports = createFileTransports(config);
      expect(transports).toEqual([]);
    });

    it('should create file transport with options', () => {
      const config: LoggerConfig = {
        serviceName: 'test',
        fileOptions: {
          filename: 'test.log',
        },
      };

      const transports = createFileTransports(config);
      expect(transports).toHaveLength(1);
    });

    it('should create error file transport when specified', () => {
      const config: LoggerConfig = {
        serviceName: 'test',
        fileOptions: {
          filename: 'test.log',
          errorFilename: 'error.log',
        },
      };

      const transports = createFileTransports(config);
      expect(transports).toHaveLength(2);
    });

    it('should create file transport with default options', () => {
      const config: LoggerConfig = {
        serviceName: 'test',
        fileOptions: {
          filename: 'test.log',
        },
      };

      const transports = createFileTransports(config);
      expect(transports).toHaveLength(1);
      expect(transports[0]).toBeDefined();
    });

    it('should create file transport with custom options', () => {
      const config: LoggerConfig = {
        serviceName: 'test',
        fileOptions: {
          filename: 'test.log',
          maxSize: '50m',
          maxFiles: '30d',
        },
      };

      const transports = createFileTransports(config);
      expect(transports).toHaveLength(1);
      expect(transports[0]).toBeDefined();
    });

    it('should set error level for error file', () => {
      const config: LoggerConfig = {
        serviceName: 'test',
        fileOptions: {
          filename: 'test.log',
          errorFilename: 'error.log',
        },
      };

      const transports = createFileTransports(config);
      const errorTransport = transports[1] as any;

      expect(errorTransport.level).toBe('error');
    });
  });
});
