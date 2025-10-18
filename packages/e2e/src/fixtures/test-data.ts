/**
 * Test Data Fixtures
 * Predefined test data for E2E tests
 */

export const TEST_USERS = {
  admin: {
    email: 'admin@orion.test',
    password: 'Admin123!@#',
    username: 'admin',
    role: 'ADMIN',
  },
  user: {
    email: 'user@orion.test',
    password: 'User123!@#',
    username: 'testuser',
    role: 'USER',
  },
  moderator: {
    email: 'mod@orion.test',
    password: 'Mod123!@#',
    username: 'moderator',
    role: 'MODERATOR',
  },
};

export const INVALID_CREDENTIALS = {
  invalidEmail: {
    email: 'invalid@orion.test',
    password: 'WrongPassword123!',
  },
  malformedEmail: {
    email: 'not-an-email',
    password: 'Password123!',
  },
  weakPassword: {
    email: 'test@orion.test',
    password: '123',
  },
};

export const TEST_TOKENS = {
  expired: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9',
  invalid: 'invalid.token.here',
  malformed: 'not-a-jwt-token',
};

export const TEST_TIMEOUTS = {
  short: 1000,
  medium: 5000,
  long: 10000,
  veryLong: 30000,
};
