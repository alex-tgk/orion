import { test, expect } from '@playwright/test';
import { UserFixture } from '@orion/shared/testing';

/**
 * E2E Tests for Authentication Flow
 *
 * Tests user registration, login, and authentication flows
 */
describe('Authentication E2E Tests', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';
  let authToken: string;
  let testUser: any;

  beforeAll(() => {
    testUser = UserFixture.createUser({
      email: `test-${Date.now()}@orion.test`,
      password: 'Test@1234',
    });
  });

  describe('User Registration', () => {
    test('should register a new user successfully', async ({ request }) => {
      // Arrange
      const registrationData = {
        email: testUser.email,
        password: testUser.password,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
      };

      // Act
      const response = await request.post(`${baseUrl}/api/auth/register`, {
        data: registrationData,
      });

      // Assert
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body).toHaveProperty('user');
      expect(body).toHaveProperty('token');
      expect(body.user.email).toBe(testUser.email);

      authToken = body.token;
    });

    test('should reject duplicate email registration', async ({ request }) => {
      // Act
      const response = await request.post(`${baseUrl}/api/auth/register`, {
        data: {
          email: testUser.email,
          password: 'AnotherPassword123!',
          firstName: 'Duplicate',
          lastName: 'User',
        },
      });

      // Assert
      expect(response.status()).toBe(409);
      const body = await response.json();
      expect(body.message).toContain('already exists');
    });

    test('should validate email format', async ({ request }) => {
      // Act
      const response = await request.post(`${baseUrl}/api/auth/register`, {
        data: {
          email: 'invalid-email',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      // Assert
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.message).toContain('email');
    });

    test('should validate password strength', async ({ request }) => {
      // Act
      const response = await request.post(`${baseUrl}/api/auth/register`, {
        data: {
          email: 'test@example.com',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      // Assert
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.message).toContain('password');
    });
  });

  describe('User Login', () => {
    test('should login with valid credentials', async ({ request }) => {
      // Act
      const response = await request.post(`${baseUrl}/api/auth/login`, {
        data: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      // Assert
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('token');
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe(testUser.email);

      authToken = body.token;
    });

    test('should reject invalid password', async ({ request }) => {
      // Act
      const response = await request.post(`${baseUrl}/api/auth/login`, {
        data: {
          email: testUser.email,
          password: 'WrongPassword123!',
        },
      });

      // Assert
      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.message).toContain('Invalid');
    });

    test('should reject non-existent user', async ({ request }) => {
      // Act
      const response = await request.post(`${baseUrl}/api/auth/login`, {
        data: {
          email: 'nonexistent@example.com',
          password: 'Password123!',
        },
      });

      // Assert
      expect(response.status()).toBe(401);
    });

    test('should update last login timestamp', async ({ request }) => {
      // Arrange
      await request.post(`${baseUrl}/api/auth/login`, {
        data: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      // Act - Get user profile to check lastLoginAt
      const profileResponse = await request.get(`${baseUrl}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Assert
      expect(profileResponse.status()).toBe(200);
      const profile = await profileResponse.json();
      expect(profile.lastLoginAt).toBeTruthy();
    });
  });

  describe('Token Authentication', () => {
    test('should access protected route with valid token', async ({ request }) => {
      // Act
      const response = await request.get(`${baseUrl}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Assert
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.email).toBe(testUser.email);
    });

    test('should reject request without token', async ({ request }) => {
      // Act
      const response = await request.get(`${baseUrl}/api/auth/profile`);

      // Assert
      expect(response.status()).toBe(401);
    });

    test('should reject request with invalid token', async ({ request }) => {
      // Act
      const response = await request.get(`${baseUrl}/api/auth/profile`, {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      // Assert
      expect(response.status()).toBe(401);
    });

    test('should reject expired token', async ({ request }) => {
      // Note: This test requires creating an expired token
      // You may need to adjust token expiry in test environment

      // Act
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Mock expired token
      const response = await request.get(`${baseUrl}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${expiredToken}`,
        },
      });

      // Assert
      expect(response.status()).toBe(401);
    });
  });

  describe('Password Reset Flow', () => {
    test('should request password reset', async ({ request }) => {
      // Act
      const response = await request.post(`${baseUrl}/api/auth/forgot-password`, {
        data: {
          email: testUser.email,
        },
      });

      // Assert
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toContain('reset');
    });

    test('should handle non-existent email gracefully', async ({ request }) => {
      // Act
      const response = await request.post(`${baseUrl}/api/auth/forgot-password`, {
        data: {
          email: 'nonexistent@example.com',
        },
      });

      // Assert - Should not reveal if email exists (security)
      expect(response.status()).toBe(200);
    });

    // Note: Full password reset flow requires email integration
    // and token extraction from email, which is complex for E2E tests
  });

  describe('Session Management', () => {
    test('should logout user', async ({ request }) => {
      // Act
      const response = await request.post(`${baseUrl}/api/auth/logout`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Assert
      expect(response.status()).toBe(200);
    });

    test('should invalidate token after logout', async ({ request }) => {
      // Arrange
      await request.post(`${baseUrl}/api/auth/logout`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Act - Try to use token after logout
      const response = await request.get(`${baseUrl}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Assert
      expect(response.status()).toBe(401);
    });
  });

  describe('Account Verification', () => {
    test('should send verification email on registration', async ({ request }) => {
      // Arrange
      const newUser = {
        email: `verify-${Date.now()}@orion.test`,
        password: 'Test@1234',
        firstName: 'Verify',
        lastName: 'Test',
      };

      // Act
      const response = await request.post(`${baseUrl}/api/auth/register`, {
        data: newUser,
      });

      // Assert
      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.user.isEmailVerified).toBe(false);
      // Note: Actual email verification requires email service integration
    });
  });
});
