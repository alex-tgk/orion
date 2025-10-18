/**
 * Mock Factories
 * Factories for creating mock data for testing
 */

import { randomBytes, randomUUID } from 'crypto';

/**
 * Generate random string
 */
export function generateRandomString(length = 10): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * Generate random email
 */
export function generateRandomEmail(domain = 'test.com'): string {
  return `test-${generateRandomString(8)}@${domain}`;
}

/**
 * Generate random username
 */
export function generateRandomUsername(prefix = 'user'): string {
  return `${prefix}-${generateRandomString(8)}`;
}

/**
 * Generate random UUID
 */
export function generateUUID(): string {
  return randomUUID();
}

/**
 * Generate random integer
 */
export function generateRandomInt(min = 0, max = 100): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random boolean
 */
export function generateRandomBoolean(): boolean {
  return Math.random() < 0.5;
}

/**
 * Generate random date
 */
export function generateRandomDate(
  start = new Date(2020, 0, 1),
  end = new Date()
): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

/**
 * Mock User Factory
 */
export interface MockUser {
  id: string;
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  const defaultUser: MockUser = {
    id: generateUUID(),
    email: generateRandomEmail(),
    username: generateRandomUsername(),
    password: 'hashedPassword123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'USER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { ...defaultUser, ...overrides };
}

/**
 * Mock Token Factory
 */
export interface MockToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export function createMockToken(overrides: Partial<MockToken> = {}): MockToken {
  const defaultToken: MockToken = {
    accessToken: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${generateRandomString(32)}.${generateRandomString(32)}`,
    refreshToken: `refresh.${generateRandomString(32)}.${generateRandomString(32)}`,
    expiresIn: 3600,
    tokenType: 'Bearer',
  };

  return { ...defaultToken, ...overrides };
}

/**
 * Mock Request Factory
 */
export interface MockRequest {
  user?: MockUser;
  headers: Record<string, string>;
  query: Record<string, any>;
  params: Record<string, any>;
  body: Record<string, any>;
  method: string;
  url: string;
}

export function createMockRequest(
  overrides: Partial<MockRequest> = {}
): MockRequest {
  const defaultRequest: MockRequest = {
    headers: {
      'content-type': 'application/json',
    },
    query: {},
    params: {},
    body: {},
    method: 'GET',
    url: '/',
  };

  return { ...defaultRequest, ...overrides };
}

/**
 * Mock Response Factory
 */
export interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
  sendStatus: jest.Mock;
  set: jest.Mock;
  get: jest.Mock;
}

export function createMockResponse(): MockResponse {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    get: jest.fn(),
  };

  return res;
}

/**
 * Mock Context Factory (for GraphQL)
 */
export interface MockContext {
  req: MockRequest;
  res: MockResponse;
  user?: MockUser;
}

export function createMockContext(
  overrides: Partial<MockContext> = {}
): MockContext {
  const defaultContext: MockContext = {
    req: createMockRequest(),
    res: createMockResponse(),
  };

  return { ...defaultContext, ...overrides };
}

/**
 * Mock Prisma Transaction Client
 */
export function createMockPrismaTransaction() {
  return {
    $executeRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $transaction: jest.fn(),
  };
}

/**
 * Mock File Upload
 */
export interface MockFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export function createMockFile(overrides: Partial<MockFile> = {}): MockFile {
  const defaultFile: MockFile = {
    fieldname: 'file',
    originalname: 'test.txt',
    encoding: '7bit',
    mimetype: 'text/plain',
    size: 1024,
    buffer: Buffer.from('test file content'),
  };

  return { ...defaultFile, ...overrides };
}

/**
 * Mock Pagination Result
 */
export interface MockPaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function createMockPaginationResult<T>(
  data: T[],
  page = 1,
  limit = 10,
  total?: number
): MockPaginationResult<T> {
  const actualTotal = total ?? data.length;
  const totalPages = Math.ceil(actualTotal / limit);

  return {
    data,
    total: actualTotal,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
