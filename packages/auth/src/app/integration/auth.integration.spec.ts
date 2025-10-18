import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { TestDatabase, UserFixture } from '@orion/shared/testing';

/**
 * Integration Tests for Auth Service
 *
 * Tests the complete authentication flow with database and Redis
 */
describe('Auth Service Integration Tests', () => {
  let app: INestApplication;
  let testDb: any;

  beforeAll(async () => {
    // Initialize test database
    testDb = await TestDatabase.initialize();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await TestDatabase.close();
  });

  beforeEach(async () => {
    await TestDatabase.cleanup();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return token', async () => {
      // Arrange
      const userData = {
        email: 'newuser@test.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should hash password before storing', async () => {
      // Arrange
      const userData = {
        email: 'hashtest@test.com',
        password: 'PlainTextPassword123!',
        firstName: 'Hash',
        lastName: 'Test',
      };

      // Act
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Verify password is hashed in database
      const user = await testDb.user.findUnique({
        where: { email: userData.email },
      });

      // Assert
      expect(user.password).not.toBe(userData.password);
      expect(user.password).toMatch(/^\$2[ayb]\$.{56}$/); // Bcrypt hash pattern
    });

    it('should create user session on registration', async () => {
      // Arrange
      const userData = {
        email: 'session@test.com',
        password: 'Password123!',
        firstName: 'Session',
        lastName: 'Test',
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData);

      // Verify session exists in database/cache
      const sessions = await testDb.session.findMany({
        where: { userId: response.body.user.id },
      });

      // Assert
      expect(sessions).toHaveLength(1);
      expect(sessions[0].token).toBe(response.body.token);
    });

    it('should reject duplicate email', async () => {
      // Arrange
      const userData = {
        email: 'duplicate@test.com',
        password: 'Password123!',
        firstName: 'First',
        lastName: 'User',
      };

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData);

      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...userData, firstName: 'Second' })
        .expect(409);

      // Assert
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    let existingUser: any;

    beforeEach(async () => {
      // Create test user
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'login@test.com',
          password: 'Password123!',
          firstName: 'Login',
          lastName: 'Test',
        });

      existingUser = response.body.user;
    });

    it('should login with valid credentials', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'Password123!',
        })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('login@test.com');
    });

    it('should update lastLoginAt timestamp', async () => {
      // Arrange
      const beforeLogin = new Date();

      // Act
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'Password123!',
        });

      // Get updated user
      const user = await testDb.user.findUnique({
        where: { email: 'login@test.com' },
      });

      // Assert
      expect(user.lastLoginAt).toBeTruthy();
      expect(new Date(user.lastLoginAt).getTime()).toBeGreaterThanOrEqual(
        beforeLogin.getTime()
      );
    });

    it('should reject invalid password', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'WrongPassword123!',
        })
        .expect(401);

      // Assert
      expect(response.body.message).toContain('Invalid');
    });

    it('should reject non-existent user', async () => {
      // Act
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Password123!',
        })
        .expect(401);
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'profile@test.com',
          password: 'Password123!',
          firstName: 'Profile',
          lastName: 'Test',
        });

      authToken = response.body.token;
      userId = response.body.user.id;
    });

    it('should get user profile with valid token', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.email).toBe('profile@test.com');
      expect(response.body.id).toBe(userId);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should reject request without token', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'logout@test.com',
          password: 'Password123!',
          firstName: 'Logout',
          lastName: 'Test',
        });

      authToken = response.body.token;
    });

    it('should logout user and invalidate token', async () => {
      // Act - Logout
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Try to use token after logout
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);
    });

    it('should delete session from database', async () => {
      // Arrange
      const beforeSessions = await testDb.session.count();

      // Act
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      const afterSessions = await testDb.session.count();

      // Assert
      expect(afterSessions).toBeLessThan(beforeSessions);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      // Arrange - Make multiple failed login attempts
      const attempts = Array(10).fill(null);

      // Act
      for (const _ of attempts) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: 'ratelimit@test.com',
            password: 'WrongPassword!',
          });
      }

      // Final attempt should be rate limited
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'ratelimit@test.com',
          password: 'WrongPassword!',
        });

      // Assert
      expect(response.status).toBe(429); // Too Many Requests
    });
  });

  describe('Email Verification', () => {
    it('should mark user as unverified on registration', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'unverified@test.com',
          password: 'Password123!',
          firstName: 'Unverified',
          lastName: 'User',
        });

      // Assert
      expect(response.body.user.isEmailVerified).toBe(false);
    });

    // Note: Email verification flow requires email service integration
  });
});
