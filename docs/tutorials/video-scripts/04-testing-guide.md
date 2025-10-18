# Tutorial 04: Writing Effective Tests

**Duration**: 25 minutes
**Level**: Intermediate
**Prerequisites**: Tutorials 01-03 completed, TypeScript basics

## Learning Objectives

By the end of this tutorial, you will be able to:
- Write comprehensive unit tests with Jest
- Create integration tests for API endpoints
- Mock external dependencies effectively
- Implement E2E tests for complete workflows
- Measure and improve test coverage
- Follow testing best practices for microservices

## Prerequisites

### Required Knowledge
- Completion of Tutorials 01-03
- TypeScript and async/await
- Basic testing concepts
- HTTP and REST APIs

### Required Setup
- ORION development environment
- Task service from previous tutorials
- PostgreSQL and Redis running

## Tutorial Outline

### Part 1: Testing Philosophy (3 minutes)
### Part 2: Unit Testing (8 minutes)
### Part 3: Integration Testing (7 minutes)
### Part 4: E2E Testing (5 minutes)
### Part 5: Coverage & Best Practices (2 minutes)

---

## Detailed Script

### Part 1: Testing Philosophy (3 minutes)

**[SCREEN: Testing pyramid diagram]**

**NARRATOR**: Welcome! Testing is crucial for microservices. In ORION, we follow the testing pyramid:
- **Unit Tests** (70%): Fast, isolated, test single functions
- **Integration Tests** (20%): Test service interactions
- **E2E Tests** (10%): Test complete user flows

**[SCREEN: Show ORION test structure]**

**TYPE:**
```bash
# View test structure
tree packages/task/src -I 'node_modules'
```

**EXPECTED OUTPUT:**
```
packages/task/src
├── app/
│   ├── app.controller.spec.ts    # Controller tests
│   ├── app.controller.ts
│   ├── app.service.spec.ts       # Service tests
│   └── app.service.ts
└── test/
    ├── app.e2e-spec.ts           # E2E tests
    └── test-utils.ts             # Test helpers
```

---

### Part 2: Unit Testing (8 minutes)

**[SCREEN: VS Code with app.service.spec.ts]**

**NARRATOR**: Let's write comprehensive unit tests for our Task service.

#### Testing Service Methods

**TYPE:**
```typescript
// packages/task/src/app/app.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TaskStatus, TaskPriority } from '@prisma/client';

// Mock Prisma Client
const mockPrismaClient = {
  task: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: 'PrismaService',
          useValue: mockPrismaClient,
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a task successfully', async () => {
      const createDto = {
        title: 'Test Task',
        description: 'Test Description',
        priority: TaskPriority.HIGH,
      };
      const userId = 'user-123';
      const expectedTask = {
        id: 'task-123',
        ...createDto,
        status: TaskStatus.TODO,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.task.create.mockResolvedValue(expectedTask);

      const result = await service.create(createDto, userId);

      expect(result).toEqual(expectedTask);
      expect(mockPrismaClient.task.create).toHaveBeenCalledWith({
        data: { ...createDto, userId },
      });
    });

    it('should throw error for past due dates', async () => {
      const createDto = {
        title: 'Test Task',
        dueDate: '2020-01-01',
      };

      await expect(service.create(createDto, 'user-123')).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('findAll', () => {
    it('should return user tasks', async () => {
      const userId = 'user-123';
      const tasks = [
        { id: '1', title: 'Task 1', userId },
        { id: '2', title: 'Task 2', userId },
      ];

      mockPrismaClient.task.findMany.mockResolvedValue(tasks);

      const result = await service.findAll(userId);

      expect(result).toEqual(tasks);
      expect(mockPrismaClient.task.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by status', async () => {
      const userId = 'user-123';
      const status = TaskStatus.IN_PROGRESS;

      await service.findAll(userId, status);

      expect(mockPrismaClient.task.findMany).toHaveBeenCalledWith({
        where: { userId, status },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return task if owned by user', async () => {
      const task = { id: '1', userId: 'user-123', title: 'Task' };
      mockPrismaClient.task.findUnique.mockResolvedValue(task);

      const result = await service.findOne('1', 'user-123');

      expect(result).toEqual(task);
    });

    it('should throw NotFoundException if task not found', async () => {
      mockPrismaClient.task.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999', 'user-123')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException for other user task', async () => {
      const task = { id: '1', userId: 'user-456', title: 'Task' };
      mockPrismaClient.task.findUnique.mockResolvedValue(task);

      await expect(service.findOne('1', 'user-123')).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('remove', () => {
    it('should delete task successfully', async () => {
      const task = {
        id: '1',
        userId: 'user-123',
        status: TaskStatus.TODO,
      };
      mockPrismaClient.task.findUnique.mockResolvedValue(task);
      mockPrismaClient.task.delete.mockResolvedValue(task);

      const result = await service.remove('1', 'user-123');

      expect(result).toEqual({ deleted: true });
    });

    it('should not delete IN_PROGRESS tasks', async () => {
      const task = {
        id: '1',
        userId: 'user-123',
        status: TaskStatus.IN_PROGRESS,
      };
      mockPrismaClient.task.findUnique.mockResolvedValue(task);

      await expect(service.remove('1', 'user-123')).rejects.toThrow(
        ForbiddenException
      );
    });
  });
});
```

**NARRATOR**: Run the tests:

**TYPE:**
```bash
cd packages/task
pnpm test app.service.spec
```

**EXPECTED OUTPUT:**
```
PASS  src/app/app.service.spec.ts
  AppService
    create
      ✓ should create a task successfully (15ms)
      ✓ should throw error for past due dates (5ms)
    findAll
      ✓ should return user tasks (3ms)
      ✓ should filter by status (2ms)
    findOne
      ✓ should return task if owned by user (3ms)
      ✓ should throw NotFoundException if task not found (2ms)
      ✓ should throw ForbiddenException for other user task (3ms)
    remove
      ✓ should delete task successfully (4ms)
      ✓ should not delete IN_PROGRESS tasks (3ms)

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
Time:        2.456 s
```

---

### Part 3: Integration Testing (7 minutes)

**[SCREEN: Create integration test file]**

**NARRATOR**: Integration tests verify that components work together correctly.

**TYPE:**
```typescript
// packages/task/src/app/app.controller.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './app.module';
import { PrismaClient } from '@prisma/client';

describe('TaskController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Create test database connection
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL,
        },
      },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.task.deleteMany();
  });

  describe('POST /tasks', () => {
    it('should create a new task', async () => {
      const response = await request(app.getHttpServer())
        .post('/tasks')
        .send({
          title: 'Integration Test Task',
          description: 'Testing task creation',
          priority: 'HIGH',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        title: 'Integration Test Task',
        description: 'Testing task creation',
        priority: 'HIGH',
        status: 'TODO',
      });
      expect(response.body.id).toBeDefined();
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/tasks')
        .send({
          description: 'Missing title',
        })
        .expect(400);

      expect(response.body.message).toContain('title');
    });

    it('should validate title length', async () => {
      await request(app.getHttpServer())
        .post('/tasks')
        .send({
          title: 'a'.repeat(201), // Exceeds 200 char limit
        })
        .expect(400);
    });
  });

  describe('GET /tasks', () => {
    it('should return all user tasks', async () => {
      // Create test tasks
      const task1 = await prisma.task.create({
        data: {
          title: 'Task 1',
          userId: 'test-user',
        },
      });
      const task2 = await prisma.task.create({
        data: {
          title: 'Task 2',
          userId: 'test-user',
        },
      });

      const response = await request(app.getHttpServer())
        .get('/tasks')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe('Task 2'); // Ordered by createdAt desc
    });

    it('should filter by status', async () => {
      await prisma.task.create({
        data: { title: 'Todo Task', userId: 'test-user', status: 'TODO' },
      });
      await prisma.task.create({
        data: { title: 'Done Task', userId: 'test-user', status: 'DONE' },
      });

      const response = await request(app.getHttpServer())
        .get('/tasks?status=DONE')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('DONE');
    });
  });

  describe('PATCH /tasks/:id', () => {
    it('should update task status', async () => {
      const task = await prisma.task.create({
        data: { title: 'Task', userId: 'test-user' },
      });

      const response = await request(app.getHttpServer())
        .patch(`/tasks/${task.id}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(response.body.status).toBe('IN_PROGRESS');
      expect(response.body.updatedAt).not.toBe(task.updatedAt);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete completed task', async () => {
      const task = await prisma.task.create({
        data: {
          title: 'Task',
          userId: 'test-user',
          status: 'DONE',
        },
      });

      await request(app.getHttpServer())
        .delete(`/tasks/${task.id}`)
        .expect(200);

      const deleted = await prisma.task.findUnique({
        where: { id: task.id },
      });
      expect(deleted).toBeNull();
    });

    it('should not delete in-progress task', async () => {
      const task = await prisma.task.create({
        data: {
          title: 'Task',
          userId: 'test-user',
          status: 'IN_PROGRESS',
        },
      });

      await request(app.getHttpServer())
        .delete(`/tasks/${task.id}`)
        .expect(403);
    });
  });
});
```

**NARRATOR**: Create test database configuration:

**TYPE:**
```bash
# Add to .env.test
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/orion_task_test"
```

**TYPE:**
```bash
# Create test database
createdb orion_task_test

# Run migrations
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy

# Run integration tests
pnpm test:integration
```

---

### Part 4: E2E Testing (5 minutes)

**[SCREEN: Create E2E test file]**

**NARRATOR**: E2E tests verify complete user workflows.

**TYPE:**
```typescript
// packages/task/test/app.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';

describe('Task Management Workflow (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token (assuming auth service is running)
    const authResponse = await request('http://localhost:3001')
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    authToken = authResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should complete full task lifecycle', async () => {
    // 1. Create a task
    const createResponse = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'E2E Test Task',
        description: 'Complete lifecycle test',
        priority: 'HIGH',
      })
      .expect(201);

    const taskId = createResponse.body.id;
    expect(createResponse.body.status).toBe('TODO');

    // 2. Start the task
    const startResponse = await request(app.getHttpServer())
      .patch(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);

    expect(startResponse.body.status).toBe('IN_PROGRESS');

    // 3. Try to delete (should fail)
    await request(app.getHttpServer())
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(403);

    // 4. Complete the task
    await request(app.getHttpServer())
      .patch(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'DONE' })
      .expect(200);

    // 5. Delete completed task
    await request(app.getHttpServer())
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // 6. Verify deletion
    await request(app.getHttpServer())
      .get(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });
});
```

**TYPE:**
```bash
# Run E2E tests
pnpm test:e2e
```

---

### Part 5: Coverage & Best Practices (2 minutes)

**TYPE:**
```bash
# Run tests with coverage
pnpm test:coverage
```

**EXPECTED OUTPUT:**
```
Test Suites: 3 passed, 3 total
Tests:       24 passed, 24 total
Snapshots:   0 total
Time:        5.123 s

Coverage summary:
Statements   : 92.5% ( 148/160 )
Branches     : 88.2% ( 30/34 )
Functions    : 95.0% ( 19/20 )
Lines        : 94.1% ( 128/136 )
```

**NARRATOR**: ORION targets 80%+ coverage. Our task service exceeds this!

---

## Summary Checklist

✓ Write unit tests with Jest
✓ Mock external dependencies
✓ Create integration tests
✓ Implement E2E workflows
✓ Achieve 80%+ coverage
✓ Follow testing best practices

---

**Script Version**: 1.0
**Last Updated**: October 2025
**Estimated Recording Time**: 30 minutes
