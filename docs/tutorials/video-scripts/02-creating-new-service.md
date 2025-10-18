# Tutorial 02: Creating a New Microservice

**Duration**: 20 minutes
**Level**: Beginner to Intermediate
**Prerequisites**: Tutorial 01 completed, ORION development environment set up

## Learning Objectives

By the end of this tutorial, you will be able to:
- Create a service specification following ORION standards
- Generate a new microservice using the ORION CLI
- Implement core service functionality with NestJS
- Add database integration with Prisma
- Write comprehensive tests for your service
- Document your API with Swagger/OpenAPI

## Prerequisites

### Required Knowledge
- Completion of Tutorial 01
- Basic understanding of TypeScript
- Familiarity with REST APIs
- Basic database concepts

### Required Setup
- ORION development environment running
- Docker containers (PostgreSQL, Redis) running
- Auth service running successfully

## Tutorial Outline

### Part 1: Introduction & Planning (3 minutes)
### Part 2: Service Specification (4 minutes)
### Part 3: Generating the Service (5 minutes)
### Part 4: Implementing Core Logic (5 minutes)
### Part 5: Testing (3 minutes)

---

## Detailed Script

### Part 1: Introduction & Planning (3 minutes)

**[SCREEN: ORION Architecture Diagram]**

**NARRATOR**: Welcome back! In this tutorial, we're going to create a complete microservice from scratch. We'll build a "Tasks" service - a simple task management API that demonstrates all the key patterns you'll use in ORION.

**[SCREEN: Show what we're building - task management features]**

**NARRATOR**: Our Tasks service will:
- Manage tasks with CRUD operations
- Store data in PostgreSQL using Prisma
- Expose a REST API with proper authentication
- Include comprehensive tests
- Follow ORION's architectural patterns

**[SCREEN: Show ORION service creation workflow]**

**NARRATOR**: ORION follows a spec-first approach. Before writing any code, we'll:
1. Create a service specification
2. Generate the service scaffold
3. Implement business logic
4. Add tests
5. Document the API

Let's get started!

---

### Part 2: Service Specification (4 minutes)

**[SCREEN: Terminal window]**

**NARRATOR**: Every ORION service starts with a specification. This ensures we think through the design before coding.

#### Create Specification File

**TYPE:**
```bash
# Navigate to specs directory
cd .claude/specs

# Create service specification
touch task-service.md
```

**[SCREEN: Open task-service.md in editor]**

**NARRATOR**: Let's fill in our specification. I'll type this out:

**TYPE:**
```markdown
# Task Service Specification

## Overview
The Task service manages task creation, tracking, and completion for users.

## Service Details
- **Name**: task
- **Port**: 3003
- **Database**: PostgreSQL
- **Cache**: Redis
- **Message Queue**: Bull

## Data Model

### Task Entity
- id: UUID (primary key)
- title: string (required, max 200 chars)
- description: string (optional, max 2000 chars)
- status: enum (TODO, IN_PROGRESS, DONE)
- priority: enum (LOW, MEDIUM, HIGH)
- userId: UUID (foreign key to User)
- dueDate: DateTime (optional)
- createdAt: DateTime
- updatedAt: DateTime

## API Endpoints

### Create Task
POST /api/tasks
- Auth: Required (JWT)
- Body: { title, description?, priority?, dueDate? }
- Returns: Task

### Get User Tasks
GET /api/tasks
- Auth: Required
- Query: ?status=TODO&priority=HIGH
- Returns: Task[]

### Get Task by ID
GET /api/tasks/:id
- Auth: Required
- Returns: Task

### Update Task
PATCH /api/tasks/:id
- Auth: Required
- Body: Partial<Task>
- Returns: Task

### Delete Task
DELETE /api/tasks/:id
- Auth: Required
- Returns: { deleted: true }

## Business Rules
1. Users can only access their own tasks
2. Tasks cannot be deleted if status is IN_PROGRESS
3. Due dates must be in the future
4. Title is required and cannot be empty

## Dependencies
- @nestjs/common
- @nestjs/core
- @prisma/client
- class-validator
- class-transformer

## Testing Requirements
- Unit tests for all services
- Integration tests for API endpoints
- E2E tests for complete workflows
- Target coverage: 80%+
```

**[SCREEN: Save file]**

**NARRATOR**: Perfect! Our specification is complete. This document will guide our entire implementation.

#### Validate Specification

**TYPE:**
```bash
# Return to root directory
cd ../..

# Validate our specification
pnpm spec:validate
```

**EXPECTED OUTPUT:**
```
Validating service specifications...
✓ task-service.md: Valid
  - Service name: task
  - Port: 3003
  - Endpoints: 5
  - Data models: 1
```

---

### Part 3: Generating the Service (5 minutes)

**[SCREEN: Terminal window]**

**NARRATOR**: Now let's generate our service using ORION's service generator.

#### Generate Service Scaffold

**TYPE:**
```bash
# Generate new service
pnpm generate:service task

# Follow the prompts
```

**[SCREEN: Show interactive prompts]**

**PROMPTS:**
```
? Service name: task
? Port number: 3003
? Include database (Prisma)? Yes
? Include Redis cache? Yes
? Include Bull queue? No
? Generate Swagger docs? Yes
? Generate tests? Yes
```

**EXPECTED OUTPUT:**
```
Creating service: task
==================
✓ Created packages/task directory
✓ Generated package.json
✓ Generated tsconfig.json
✓ Created src structure
✓ Generated Prisma schema
✓ Created module files
✓ Created controller
✓ Created service
✓ Created DTOs
✓ Created test files
✓ Updated nx.json
✓ Updated pnpm-workspace.yaml

Service 'task' created successfully!

Next steps:
1. cd packages/task
2. npx prisma migrate dev --name init
3. pnpm test
```

**NARRATOR**: Great! Let's see what was generated.

**TYPE:**
```bash
# View the generated structure
tree packages/task -L 2
```

**EXPECTED OUTPUT:**
```
packages/task
├── package.json
├── project.json
├── tsconfig.json
├── prisma
│   └── schema.prisma
├── src
│   ├── app
│   │   ├── app.module.ts
│   │   ├── app.controller.ts
│   │   ├── app.service.ts
│   │   ├── dto
│   │   └── entities
│   └── main.ts
└── test
    ├── app.controller.spec.ts
    └── app.service.spec.ts
```

---

### Part 4: Implementing Core Logic (5 minutes)

**[SCREEN: VS Code with project open]**

**NARRATOR**: Let's implement our task service, starting with the database schema.

#### Define Prisma Schema

**[SCREEN: Open packages/task/prisma/schema.prisma]**

**NARRATOR**: The generator created a basic schema. Let's update it for our tasks:

**TYPE:**
```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
}

model Task {
  id          String       @id @default(uuid())
  title       String       @db.VarChar(200)
  description String?      @db.VarChar(2000)
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  userId      String
  dueDate     DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([userId])
  @@index([status])
  @@map("tasks")
}
```

**NARRATOR**: Now let's create and run the migration:

**TYPE:**
```bash
cd packages/task
npx prisma migrate dev --name init
npx prisma generate
```

**EXPECTED OUTPUT:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma

Applying migration `20251018000000_init`
✓ Generated Prisma Client
```

#### Create DTOs

**[SCREEN: Open packages/task/src/app/dto/create-task.dto.ts]**

**TYPE:**
```typescript
// src/app/dto/create-task.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, IsDateString } from 'class-validator';
import { TaskPriority } from '@prisma/client';

export class CreateTaskDto {
  @ApiProperty({ description: 'Task title', maxLength: 200 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Task description', required: false, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: TaskPriority, default: 'MEDIUM', required: false })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ description: 'Due date', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
```

**[SCREEN: Create update-task.dto.ts]**

**TYPE:**
```typescript
// src/app/dto/update-task.dto.ts

import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { TaskStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiProperty({ enum: TaskStatus, required: false })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
```

#### Implement Service Logic

**[SCREEN: Open packages/task/src/app/app.service.ts]**

**TYPE:**
```typescript
// src/app/app.service.ts

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, Task } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class AppService {
  private prisma = new PrismaClient();

  async create(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
    // Validate due date is in the future
    if (createTaskDto.dueDate && new Date(createTaskDto.dueDate) < new Date()) {
      throw new ForbiddenException('Due date must be in the future');
    }

    return this.prisma.task.create({
      data: {
        ...createTaskDto,
        userId,
      },
    });
  }

  async findAll(userId: string, status?: string, priority?: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        userId,
        ...(status && { status: status as any }),
        ...(priority && { priority: priority as any }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.userId !== userId) {
      throw new ForbiddenException('Cannot access tasks belonging to other users');
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string): Promise<Task> {
    // Verify ownership
    await this.findOne(id, userId);

    return this.prisma.task.update({
      where: { id },
      data: updateTaskDto,
    });
  }

  async remove(id: string, userId: string): Promise<{ deleted: boolean }> {
    const task = await this.findOne(id, userId);

    // Business rule: cannot delete IN_PROGRESS tasks
    if (task.status === 'IN_PROGRESS') {
      throw new ForbiddenException('Cannot delete tasks that are in progress');
    }

    await this.prisma.task.delete({ where: { id } });
    return { deleted: true };
  }
}
```

#### Implement Controller

**[SCREEN: Open packages/task/src/app/app.controller.ts]**

**TYPE:**
```typescript
// src/app/app.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppService } from './app.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

// Note: In real implementation, import JwtAuthGuard from shared package
// For now, we'll use a placeholder
@Controller('tasks')
@ApiTags('tasks')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard) // Uncomment when auth is integrated
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  create(@Body() createTaskDto: CreateTaskDto, @Request() req: any) {
    // In production: const userId = req.user.id;
    const userId = 'temp-user-id'; // Temporary for demo
    return this.appService.create(createTaskDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks for current user' })
  findAll(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Request() req?: any
  ) {
    const userId = 'temp-user-id';
    return this.appService.findAll(userId, status, priority);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  findOne(@Param('id') id: string, @Request() req: any) {
    const userId = 'temp-user-id';
    return this.appService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: any
  ) {
    const userId = 'temp-user-id';
    return this.appService.update(id, updateTaskDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  remove(@Param('id') id: string, @Request() req: any) {
    const userId = 'temp-user-id';
    return this.appService.remove(id, userId);
  }
}
```

**NARRATOR**: Our service implementation is complete! Let's test it.

---

### Part 5: Testing (3 minutes)

**[SCREEN: Terminal window]**

**NARRATOR**: Let's write and run tests for our new service.

#### Run Generated Tests

**TYPE:**
```bash
# Run tests
pnpm test
```

**EXPECTED OUTPUT:**
```
 PASS  packages/task/src/app/app.controller.spec.ts
 PASS  packages/task/src/app/app.service.spec.ts

Test Suites: 2 passed, 2 total
Tests:       8 passed, 8 total
```

#### Start the Service

**TYPE:**
```bash
# Start the task service
cd ../..
pnpm dev:service task
```

**EXPECTED OUTPUT:**
```
[Nest] 12345  - 10/18/2025, 3:00:00 PM     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 10/18/2025, 3:00:00 PM     LOG [NestApplication] Nest application successfully started
[Nest] 12345  - 10/18/2025, 3:00:00 PM     LOG Application listening on port 3003
```

#### Test API Endpoints

**[SCREEN: Split screen - Terminal and Browser]**

**TYPE:**
```bash
# Create a task
curl -X POST http://localhost:3003/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete ORION tutorial",
    "description": "Finish all video tutorials",
    "priority": "HIGH"
  }'
```

**EXPECTED OUTPUT:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Complete ORION tutorial",
  "description": "Finish all video tutorials",
  "status": "TODO",
  "priority": "HIGH",
  "userId": "temp-user-id",
  "dueDate": null,
  "createdAt": "2025-10-18T15:00:00.000Z",
  "updatedAt": "2025-10-18T15:00:00.000Z"
}
```

**[SCREEN: Browser showing http://localhost:3003/api]**

**NARRATOR**: And here's our Swagger documentation, automatically generated from our decorators!

---

## Common Pitfalls

### Issue 1: Database Connection Errors

**SYMPTOM:**
```
Error: P1001: Can't reach database server
```

**SOLUTION:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Update .env with correct DATABASE_URL
DATABASE_URL="postgresql://user:password@localhost:5432/orion_task"

# Create database
npx prisma migrate dev
```

### Issue 2: Port Conflicts

**SYMPTOM:**
```
Error: listen EADDRINUSE: address already in use :::3003
```

**SOLUTION:**
```bash
# Check what's using the port
lsof -i :3003

# Kill the process or use a different port
# Update project.json to use port 3004
```

### Issue 3: Validation Errors

**SYMPTOM:**
```
400 Bad Request - title should not be empty
```

**SOLUTION:**
- Ensure all required fields are provided in requests
- Check DTO validation decorators
- Review API documentation for required fields

### Issue 4: Prisma Client Not Generated

**SYMPTOM:**
```
Error: Cannot find module '@prisma/client'
```

**SOLUTION:**
```bash
# Generate Prisma client
npx prisma generate

# Reinstall dependencies if needed
pnpm install
```

---

## Summary Checklist

By now, you should have:
- ✓ Created a service specification
- ✓ Generated service scaffold with ORION CLI
- ✓ Defined Prisma schema with enums and models
- ✓ Created and ran database migrations
- ✓ Implemented DTOs with validation
- ✓ Implemented service business logic
- ✓ Created REST API controller
- ✓ Written and passed tests
- ✓ Generated Swagger documentation
- ✓ Started and tested the service

---

## Next Steps

### Enhance the Service
1. **Add authentication**: Integrate with auth service
2. **Implement caching**: Add Redis caching for queries
3. **Add pagination**: Implement cursor-based pagination
4. **Task assignments**: Add user assignment functionality

### Next Tutorial
**Tutorial 03: Database Migrations**
- Advanced Prisma schema patterns
- Managing schema changes
- Data migrations
- Production migration strategies

### Additional Resources
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Service Architecture Guide](/docs/architecture/OVERVIEW.md)
- [Testing Best Practices](/docs/guides/TESTING.md)

---

## Commands Reference

### Service Generation
```bash
# Generate new service
pnpm generate:service <service-name>

# Validate specification
pnpm spec:validate

# Check spec coverage
pnpm spec:coverage
```

### Database Management
```bash
# Create migration
npx prisma migrate dev --name <migration-name>

# Generate Prisma client
npx prisma generate

# View database in browser
npx prisma studio
```

### Development
```bash
# Start service
pnpm dev:service <service-name>

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

### API Testing
```bash
# Create resource
curl -X POST http://localhost:3003/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Task title"}'

# Get all resources
curl http://localhost:3003/tasks

# Get by ID
curl http://localhost:3003/tasks/:id

# Update resource
curl -X PATCH http://localhost:3003/tasks/:id \
  -H "Content-Type: application/json" \
  -d '{"status": "DONE"}'

# Delete resource
curl -X DELETE http://localhost:3003/tasks/:id
```

---

## Video Production Notes

### Camera Angles
- **Code editor**: Full screen for code writing segments
- **Terminal**: Full terminal with large font (16pt+)
- **Swagger UI**: Full browser for API testing
- **Split screen**: Terminal + Browser during testing

### Pacing
- Slow down during code typing (use snippets)
- Pause after each major section
- Allow time for output to be read
- Speed up during repetitive tasks (with callout)

### Visual Aids
- Highlight new code with colored underlines
- Use diff view to show changes
- Animate the service architecture diagram
- Show DTO validation in action with red/green indicators

### Code Snippets
Pre-prepare these for faster recording:
- Prisma schema
- DTOs (Create, Update)
- Service methods
- Controller endpoints

---

**Script Version**: 1.0
**Last Updated**: October 2025
**Estimated Recording Time**: 25 minutes (20 min tutorial + 5 min buffer)
