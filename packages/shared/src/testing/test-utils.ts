/**
 * Test Utilities
 * Common testing utilities and helpers for all packages
 */

import { ModuleMetadata } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import Redis from 'ioredis';

/**
 * Mock Repository Factory
 * Creates a mock TypeORM repository with common methods
 */
export function createMockRepository<T = any>(): jest.Mocked<Repository<T>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    findBy: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
    query: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
      execute: jest.fn(),
    })),
  } as any;
}

/**
 * Mock Redis Client Factory
 * Creates a mock Redis client with common methods
 */
export function createMockRedis(): jest.Mocked<Redis> {
  return {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    keys: jest.fn(),
    scan: jest.fn(),
    mget: jest.fn(),
    mset: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
    incrby: jest.fn(),
    decrby: jest.fn(),
    lpush: jest.fn(),
    rpush: jest.fn(),
    lpop: jest.fn(),
    rpop: jest.fn(),
    lrange: jest.fn(),
    llen: jest.fn(),
    sadd: jest.fn(),
    srem: jest.fn(),
    smembers: jest.fn(),
    sismember: jest.fn(),
    zadd: jest.fn(),
    zrem: jest.fn(),
    zrange: jest.fn(),
    zrangebyscore: jest.fn(),
    zcard: jest.fn(),
    hset: jest.fn(),
    hget: jest.fn(),
    hgetall: jest.fn(),
    hdel: jest.fn(),
    hkeys: jest.fn(),
    hvals: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    quit: jest.fn(),
    disconnect: jest.fn(),
    flushdb: jest.fn(),
    flushall: jest.fn(),
  } as any;
}

/**
 * Create Testing Module
 * Simplified creation of NestJS testing module
 */
export async function createTestingModule(
  metadata: ModuleMetadata
): Promise<TestingModule> {
  const moduleBuilder = Test.createTestingModule(metadata);
  return moduleBuilder.compile();
}

/**
 * Mock Logger
 * Creates a mock logger for testing
 */
export function createMockLogger() {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };
}

/**
 * Mock Config Service
 * Creates a mock configuration service
 */
export function createMockConfigService(config: Record<string, any> = {}) {
  return {
    get: jest.fn((key: string, defaultValue?: any) => {
      return config[key] ?? defaultValue;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (!(key in config)) {
        throw new Error(`Configuration key ${key} not found`);
      }
      return config[key];
    }),
  };
}

/**
 * Mock JWT Service
 * Creates a mock JWT service for authentication testing
 */
export function createMockJwtService() {
  return {
    sign: jest.fn((payload: any) => `mock-jwt-token-${JSON.stringify(payload)}`),
    signAsync: jest.fn(async (payload: any) => `mock-jwt-token-${JSON.stringify(payload)}`),
    verify: jest.fn((token: string) => ({ userId: '123', email: 'test@example.com' })),
    verifyAsync: jest.fn(async (token: string) => ({ userId: '123', email: 'test@example.com' })),
    decode: jest.fn((token: string) => ({ userId: '123', email: 'test@example.com' })),
  };
}

/**
 * Mock Event Emitter
 * Creates a mock event emitter for testing
 */
export function createMockEventEmitter() {
  return {
    emit: jest.fn(),
    emitAsync: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    listeners: jest.fn(() => []),
    listenerCount: jest.fn(() => 0),
  };
}

/**
 * Mock HTTP Service
 * Creates a mock HTTP service for external API testing
 */
export function createMockHttpService() {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    head: jest.fn(),
    options: jest.fn(),
  };
}

/**
 * Mock Queue
 * Creates a mock Bull queue for testing
 */
export function createMockQueue() {
  return {
    add: jest.fn(),
    process: jest.fn(),
    on: jest.fn(),
    getJob: jest.fn(),
    getJobs: jest.fn(),
    getJobCounts: jest.fn(),
    clean: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    close: jest.fn(),
  };
}

/**
 * Mock WebSocket Gateway
 * Creates a mock WebSocket gateway for testing
 */
export function createMockWebSocketGateway() {
  return {
    server: {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    },
    handleConnection: jest.fn(),
    handleDisconnect: jest.fn(),
  };
}

/**
 * Wait for async operations
 * Utility to wait for promises to resolve
 */
export async function waitForAsync(ms = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Flush all promises
 * Ensures all pending promises are resolved
 */
export async function flushPromises(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Create spy function with implementation
 */
export function createSpy<T extends (...args: any[]) => any>(
  implementation?: T
): jest.MockedFunction<T> {
  return jest.fn(implementation) as jest.MockedFunction<T>;
}
