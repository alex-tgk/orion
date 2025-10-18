import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { DatabaseService } from '../services/database.service';

/**
 * Integration tests for Storage Service
 * These tests require a running MinIO/S3 instance and PostgreSQL database
 */
describe('Storage Service Integration Tests', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    databaseService = moduleFixture.get<DatabaseService>(DatabaseService);

    await app.init();
  });

  afterAll(async () => {
    await databaseService.$disconnect();
    await app.close();
  });

  describe('Health Check (GET /health)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('uptime');
          expect(res.body).toHaveProperty('checks');
          expect(res.body.checks).toHaveProperty('database');
          expect(res.body.checks).toHaveProperty('s3');
        });
    });
  });

  describe('File Upload (POST /files/upload)', () => {
    it('should upload a file successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/files/upload')
        .set('x-user-id', 'test-user-123')
        .attach('file', Buffer.from('test file content'), 'test.txt')
        .field('description', 'Test file upload')
        .field('tags', JSON.stringify(['test', 'integration']))
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('filename', 'test.txt');
      expect(response.body).toHaveProperty('userId', 'test-user-123');
      expect(response.body).toHaveProperty('s3Key');
      expect(response.body.metadata).toBeDefined();

      // Clean up - delete the uploaded file
      const fileId = response.body.id;
      await request(app.getHttpServer())
        .delete(`/files/${fileId}`)
        .set('x-user-id', 'test-user-123')
        .expect(204);
    });

    it('should return 400 if no file is provided', () => {
      return request(app.getHttpServer())
        .post('/files/upload')
        .set('x-user-id', 'test-user-123')
        .expect(400);
    });

    it('should return 400 if no user ID is provided', () => {
      return request(app.getHttpServer())
        .post('/files/upload')
        .attach('file', Buffer.from('test content'), 'test.txt')
        .expect(400);
    });
  });

  describe('Generate Signed URL (POST /files/signed-url)', () => {
    it('should generate a pre-signed upload URL', async () => {
      const response = await request(app.getHttpServer())
        .post('/files/signed-url')
        .set('x-user-id', 'test-user-123')
        .send({
          filename: 'direct-upload.pdf',
          mimeType: 'application/pdf',
          size: 2048,
        })
        .expect(200);

      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('s3Key');
      expect(response.body).toHaveProperty('fileId');
      expect(response.body).toHaveProperty('expiresAt');

      // Clean up
      const fileId = response.body.fileId;
      await request(app.getHttpServer())
        .delete(`/files/${fileId}`)
        .set('x-user-id', 'test-user-123')
        .expect(204);
    });

    it('should return 400 for invalid request', () => {
      return request(app.getHttpServer())
        .post('/files/signed-url')
        .set('x-user-id', 'test-user-123')
        .send({
          filename: 'test.pdf',
          // Missing mimeType
        })
        .expect(400);
    });
  });

  describe('File Retrieval (GET /files/:id)', () => {
    let uploadedFileId: string;

    beforeAll(async () => {
      // Upload a file for testing
      const response = await request(app.getHttpServer())
        .post('/files/upload')
        .set('x-user-id', 'test-user-123')
        .attach('file', Buffer.from('test content'), 'retrieve-test.txt')
        .expect(201);

      uploadedFileId = response.body.id;
    });

    afterAll(async () => {
      // Clean up
      if (uploadedFileId) {
        await request(app.getHttpServer())
          .delete(`/files/${uploadedFileId}`)
          .set('x-user-id', 'test-user-123')
          .expect(204);
      }
    });

    it('should retrieve file metadata', async () => {
      const response = await request(app.getHttpServer())
        .get(`/files/${uploadedFileId}`)
        .set('x-user-id', 'test-user-123')
        .expect(200);

      expect(response.body).toHaveProperty('id', uploadedFileId);
      expect(response.body).toHaveProperty('filename', 'retrieve-test.txt');
      expect(response.body).toHaveProperty('metadata');
    });

    it('should return 404 for non-existent file', () => {
      return request(app.getHttpServer())
        .get('/files/00000000-0000-0000-0000-000000000000')
        .set('x-user-id', 'test-user-123')
        .expect(404);
    });

    it('should return 400 for invalid UUID', () => {
      return request(app.getHttpServer())
        .get('/files/invalid-uuid')
        .set('x-user-id', 'test-user-123')
        .expect(400);
    });
  });

  describe('File Download (GET /files/:id/download)', () => {
    let uploadedFileId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/files/upload')
        .set('x-user-id', 'test-user-123')
        .attach('file', Buffer.from('download test content'), 'download-test.txt')
        .expect(201);

      uploadedFileId = response.body.id;
    });

    afterAll(async () => {
      if (uploadedFileId) {
        await request(app.getHttpServer())
          .delete(`/files/${uploadedFileId}`)
          .set('x-user-id', 'test-user-123')
          .expect(204);
      }
    });

    it('should download a file', async () => {
      const response = await request(app.getHttpServer())
        .get(`/files/${uploadedFileId}/download`)
        .set('x-user-id', 'test-user-123')
        .expect(200);

      expect(response.header['content-type']).toMatch(/text\/plain/);
      expect(response.header['content-disposition']).toContain('attachment');
      expect(response.text).toContain('download test content');
    });

    it('should return 404 for non-existent file', () => {
      return request(app.getHttpServer())
        .get('/files/00000000-0000-0000-0000-000000000000/download')
        .set('x-user-id', 'test-user-123')
        .expect(404);
    });
  });

  describe('List Files (GET /files)', () => {
    let uploadedFileIds: string[] = [];

    beforeAll(async () => {
      // Upload multiple files for testing
      const files = [
        { name: 'list-test-1.txt', content: 'content 1', tags: ['test'] },
        { name: 'list-test-2.pdf', content: 'content 2', tags: ['document'] },
        { name: 'list-test-3.jpg', content: 'content 3', tags: ['image'] },
      ];

      for (const file of files) {
        const response = await request(app.getHttpServer())
          .post('/files/upload')
          .set('x-user-id', 'test-user-123')
          .attach('file', Buffer.from(file.content), file.name)
          .field('tags', JSON.stringify(file.tags))
          .expect(201);

        uploadedFileIds.push(response.body.id);
      }
    });

    afterAll(async () => {
      // Clean up all uploaded files
      for (const fileId of uploadedFileIds) {
        await request(app.getHttpServer())
          .delete(`/files/${fileId}`)
          .set('x-user-id', 'test-user-123')
          .expect(204);
      }
    });

    it('should list all user files with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/files')
        .set('x-user-id', 'test-user-123')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('files');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 10);
      expect(Array.isArray(response.body.files)).toBe(true);
      expect(response.body.files.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter files by mimeType', async () => {
      const response = await request(app.getHttpServer())
        .get('/files')
        .set('x-user-id', 'test-user-123')
        .query({ mimeType: 'text/' })
        .expect(200);

      expect(response.body.files.every((f: any) => f.mimeType.startsWith('text/'))).toBe(true);
    });

    it('should filter files by search term', async () => {
      const response = await request(app.getHttpServer())
        .get('/files')
        .set('x-user-id', 'test-user-123')
        .query({ search: 'list-test' })
        .expect(200);

      expect(response.body.files.every((f: any) => f.filename.includes('list-test'))).toBe(true);
    });
  });

  describe('Delete File (DELETE /files/:id)', () => {
    it('should delete a file', async () => {
      // Upload a file
      const uploadResponse = await request(app.getHttpServer())
        .post('/files/upload')
        .set('x-user-id', 'test-user-123')
        .attach('file', Buffer.from('delete me'), 'delete-test.txt')
        .expect(201);

      const fileId = uploadResponse.body.id;

      // Delete the file
      await request(app.getHttpServer())
        .delete(`/files/${fileId}`)
        .set('x-user-id', 'test-user-123')
        .expect(204);

      // Verify file is deleted
      await request(app.getHttpServer())
        .get(`/files/${fileId}`)
        .set('x-user-id', 'test-user-123')
        .expect(404);
    });

    it('should return 404 when deleting non-existent file', () => {
      return request(app.getHttpServer())
        .delete('/files/00000000-0000-0000-0000-000000000000')
        .set('x-user-id', 'test-user-123')
        .expect(404);
    });
  });
});
