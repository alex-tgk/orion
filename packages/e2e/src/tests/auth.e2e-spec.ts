/**
 * Authentication E2E Tests
 * Tests the complete authentication flow including:
 * - User registration
 * - User login
 * - Token validation
 * - Password reset
 * - Session management
 */

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  createTestApp,
  closeTestApp,
  authenticatedRequest,
  generateTestEmail,
  generateTestUsername,
} from '../utils/test-helpers';
import { clearDatabase, seedTestData } from '../utils/database-setup';
import { TEST_USERS, INVALID_CREDENTIALS } from '../fixtures/test-data';

describe('Authentication E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    // Create test application
    // This would import the actual AuthModule
    app = await createTestApp({
      imports: [
        // AuthModule,
        // ... other required modules
      ],
    });
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('User Registration Flow', () => {
    it('should register a new user with valid credentials', async () => {
      const testEmail = generateTestEmail();
      const testUsername = generateTestUsername();

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'SecurePassword123!',
          username: testUsername,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        user: {
          email: testEmail,
          username: testUsername,
        },
        tokens: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      });

      // Store tokens for subsequent tests
      authToken = response.body.tokens.accessToken;
      refreshToken = response.body.tokens.refreshToken;
    });

    it('should reject registration with duplicate email', async () => {
      const testEmail = generateTestEmail();
      const userData = {
        email: testEmail,
        password: 'SecurePassword123!',
        username: generateTestUsername(),
      };

      // First registration
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Duplicate registration
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...userData,
          username: generateTestUsername(), // Different username
        })
        .expect(409); // Conflict
    });

    it('should reject registration with weak password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: generateTestEmail(),
          password: '123', // Too weak
          username: generateTestUsername(),
        })
        .expect(400);
    });

    it('should reject registration with invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'SecurePassword123!',
          username: generateTestUsername(),
        })
        .expect(400);
    });

    it('should reject registration with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: generateTestEmail(),
          // Missing password and username
        })
        .expect(400);
    });
  });

  describe('User Login Flow', () => {
    beforeEach(async () => {
      // Seed a test user
      await seedTestData(async (prisma) => {
        // Create test user
        // await prisma.user.create({ data: TEST_USERS.user });
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: TEST_USERS.user.email,
          password: TEST_USERS.user.password,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        user: {
          email: TEST_USERS.user.email,
        },
        tokens: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      });

      authToken = response.body.tokens.accessToken;
    });

    it('should reject login with invalid password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(INVALID_CREDENTIALS.invalidEmail)
        .expect(401);
    });

    it('should reject login with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@orion.test',
          password: 'SomePassword123!',
        })
        .expect(401);
    });

    it('should rate limit excessive login attempts', async () => {
      const loginAttempts = Array(11).fill(null); // Attempt 11 logins

      for (const _ of loginAttempts) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send(INVALID_CREDENTIALS.invalidEmail);
      }

      // 11th attempt should be rate limited
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(INVALID_CREDENTIALS.invalidEmail)
        .expect(429); // Too Many Requests
    });
  });

  describe('Token Validation and Refresh', () => {
    beforeEach(async () => {
      // Register and login to get tokens
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: generateTestEmail(),
          password: 'SecurePassword123!',
          username: generateTestUsername(),
        });

      authToken = response.body.tokens.accessToken;
      refreshToken = response.body.tokens.refreshToken;
    });

    it('should access protected route with valid token', async () => {
      await authenticatedRequest(app, authToken)
        .get('/api/auth/profile')
        .expect(200);
    });

    it('should reject access with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject access with expired token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${INVALID_CREDENTIALS.expired}`)
        .expect(401);
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });

      // Verify new token works
      await authenticatedRequest(app, response.body.accessToken)
        .get('/api/auth/profile')
        .expect(200);
    });

    it('should reject refresh with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);
    });
  });

  describe('Password Reset Flow', () => {
    beforeEach(async () => {
      await seedTestData(async (prisma) => {
        // Create test user
        // await prisma.user.create({ data: TEST_USERS.user });
      });
    });

    it('should initiate password reset for existing user', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: TEST_USERS.user.email })
        .expect(200);

      // Verify reset token was created (check database or email)
    });

    it('should not reveal if email exists during password reset', async () => {
      // Should return success even for non-existent email (security)
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@orion.test' })
        .expect(200);
    });

    it('should reset password with valid reset token', async () => {
      // Request password reset
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: TEST_USERS.user.email });

      // Get reset token (from database or mock)
      const resetToken = 'mock-reset-token';

      // Reset password
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewSecurePassword123!',
        })
        .expect(200);

      // Verify login with new password
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: TEST_USERS.user.email,
          password: 'NewSecurePassword123!',
        })
        .expect(200);
    });

    it('should reject password reset with expired token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: 'expired-reset-token',
          newPassword: 'NewPassword123!',
        })
        .expect(401);
    });
  });

  describe('Logout and Session Management', () => {
    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: generateTestEmail(),
          password: 'SecurePassword123!',
          username: generateTestUsername(),
        });

      authToken = response.body.tokens.accessToken;
      refreshToken = response.body.tokens.refreshToken;
    });

    it('should logout and invalidate tokens', async () => {
      // Logout
      await authenticatedRequest(app, authToken)
        .post('/api/auth/logout')
        .expect(200);

      // Verify token is invalidated
      await authenticatedRequest(app, authToken)
        .get('/api/auth/profile')
        .expect(401);
    });

    it('should logout from all devices', async () => {
      // Create multiple sessions
      const session1 = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: TEST_USERS.user.email,
          password: TEST_USERS.user.password,
        });

      const session2 = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: TEST_USERS.user.email,
          password: TEST_USERS.user.password,
        });

      // Logout from all devices
      await authenticatedRequest(app, session1.body.tokens.accessToken)
        .post('/api/auth/logout-all')
        .expect(200);

      // Verify both tokens are invalidated
      await authenticatedRequest(app, session1.body.tokens.accessToken)
        .get('/api/auth/profile')
        .expect(401);

      await authenticatedRequest(app, session2.body.tokens.accessToken)
        .get('/api/auth/profile')
        .expect(401);
    });
  });

  describe('Multi-Factor Authentication', () => {
    it('should enable MFA for user account', async () => {
      const response = await authenticatedRequest(app, authToken)
        .post('/api/auth/mfa/enable')
        .expect(200);

      expect(response.body).toMatchObject({
        secret: expect.any(String),
        qrCode: expect.any(String),
      });
    });

    it('should verify MFA token during login', async () => {
      // Enable MFA first
      await authenticatedRequest(app, authToken)
        .post('/api/auth/mfa/enable');

      // Login should now require MFA
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: TEST_USERS.user.email,
          password: TEST_USERS.user.password,
        })
        .expect(200);

      expect(loginResponse.body).toMatchObject({
        requiresMfa: true,
        tempToken: expect.any(String),
      });

      // Complete login with MFA code
      await request(app.getHttpServer())
        .post('/api/auth/mfa/verify')
        .send({
          tempToken: loginResponse.body.tempToken,
          code: '123456', // Mock MFA code
        })
        .expect(200);
    });

    it('should disable MFA for user account', async () => {
      await authenticatedRequest(app, authToken)
        .post('/api/auth/mfa/disable')
        .expect(200);
    });
  });
});
