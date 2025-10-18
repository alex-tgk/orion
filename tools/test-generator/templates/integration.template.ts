import { SourceFileAnalysis } from '../types';

/**
 * Generate integration test template
 */
export function generateIntegrationTest(analysis: SourceFileAnalysis): string {
  const className = analysis.className || 'Module';
  const moduleName = className.replace(/Controller|Service/, 'Module');

  return `import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ${moduleName} } from './${moduleName.toLowerCase().replace('module', '')}.module';

describe('${className} Integration Tests', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [${moduleName}],
    })
      .overrideProvider('PrismaService')
      .useValue({
        // Mock PrismaService
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('API Endpoints', () => {
${generateEndpointTests(analysis)}
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent resources', () => {
      return request(app.getHttpServer())
        .get('/non-existent')
        .expect(404);
    });

    it('should handle validation errors', () => {
      return request(app.getHttpServer())
        .post('/api/endpoint')
        .send({ invalid: 'data' })
        .expect(400);
    });

    it('should handle authentication errors', () => {
      return request(app.getHttpServer())
        .get('/protected-endpoint')
        .expect(401);
    });
  });

  describe('Database Integration', () => {
    it('should persist data correctly', async () => {
      // Arrange
      const testData = {};

      // Act - Create resource
      const createResponse = await request(app.getHttpServer())
        .post('/api/endpoint')
        .send(testData)
        .expect(201);

      // Assert - Verify persistence
      const getResponse = await request(app.getHttpServer())
        .get(\`/api/endpoint/\${createResponse.body.id}\`)
        .expect(200);

      expect(getResponse.body).toMatchObject(testData);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app.getHttpServer())
          .post('/api/endpoint')
          .send({ data: \`test-\${i}\` })
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/api/endpoint')
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});
`;
}

function generateEndpointTests(analysis: SourceFileAnalysis): string {
  const tests: string[] = [];

  for (const func of analysis.functions) {
    const decorator = func.decorators.find(d =>
      ['Get', 'Post', 'Put', 'Delete', 'Patch'].includes(d)
    );

    if (!decorator) continue;

    const method = decorator.toLowerCase();
    const endpoint = `/api/${func.name}`;

    tests.push(`    it('should ${method.toUpperCase()} ${endpoint}', async () => {
      const response = await request(app.getHttpServer())
        .${method}('${endpoint}')
        ${method === 'post' || method === 'put' ? `.send({ /* request body */ })` : ''}
        .expect(${method === 'post' ? '201' : '200'});

      expect(response.body).toBeDefined();
      // TODO: Add specific assertions
    });`);
  }

  return tests.join('\n\n');
}
