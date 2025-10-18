# ORION Storage Service

A production-grade file storage microservice built with NestJS, AWS S3/MinIO, and PostgreSQL.

## Features

### Core Functionality
- **File Upload**: Multipart file uploads with metadata
- **File Download**: Streaming downloads with proper content disposition
- **File Deletion**: Soft delete with S3 cleanup
- **Signed URLs**: Pre-signed URLs for direct client uploads
- **File Listing**: Paginated file listing with filters
- **Metadata Tracking**: Tags, descriptions, custom metadata
- **Virus Scanning Hook**: Integration point for antivirus scanning

### Technical Highlights
- Full TypeScript with strict type safety
- Comprehensive test coverage (unit + integration)
- Event-driven architecture (file.uploaded, file.deleted, file.scanned)
- S3/MinIO compatible storage
- Streaming file downloads for memory efficiency
- Database-backed metadata with Prisma ORM
- Swagger/OpenAPI documentation
- Health check endpoint

## API Endpoints

### File Operations
- `POST /api/files/upload` - Upload a file
- `GET /api/files/:id` - Get file metadata
- `GET /api/files/:id/download` - Download a file
- `DELETE /api/files/:id` - Delete a file
- `POST /api/files/signed-url` - Generate pre-signed upload URL
- `GET /api/files` - List files (with pagination & filters)

### Health
- `GET /api/health` - Service health check

## Database Schema

```prisma
model File {
  id         String    @id @default(uuid())
  userId     String
  filename   String
  size       Int
  mimeType   String
  s3Key      String    @unique
  s3Bucket   String
  uploadedAt DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  deletedAt  DateTime?
  metadata   FileMetadata?
}

model FileMetadata {
  id              String    @id @default(uuid())
  fileId          String    @unique
  description     String?
  tags            String[]
  customData      Json?
  virusScanStatus String?   @default("pending")
  virusScanDate   DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

## Configuration

### Environment Variables

```bash
# Service
STORAGE_PORT=3008
STORAGE_DATABASE_URL=postgresql://user:password@localhost:5432/orion_storage

# S3/MinIO
S3_REGION=us-east-1
S3_BUCKET=orion-storage
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_ENDPOINT=http://localhost:9000  # For MinIO
S3_FORCE_PATH_STYLE=true  # Required for MinIO
S3_SIGNED_URL_EXPIRY=3600

# File Upload
MAX_FILE_SIZE=104857600  # 100MB
```

## Project Structure

```
packages/storage/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   └── app/
│       ├── config/            # Configuration modules
│       │   ├── app.config.ts
│       │   ├── s3.config.ts
│       │   └── database.config.ts
│       ├── dto/               # Data Transfer Objects
│       │   ├── upload-file.dto.ts
│       │   ├── file-response.dto.ts
│       │   ├── signed-url.dto.ts
│       │   ├── list-files.dto.ts
│       │   └── virus-scan.dto.ts
│       ├── entities/          # Entity types
│       │   └── file.entity.ts
│       ├── services/          # Business logic
│       │   ├── database.service.ts
│       │   ├── s3.service.ts
│       │   ├── file.service.ts
│       │   └── health.service.ts
│       ├── integration/       # Integration tests
│       │   └── storage.integration.spec.ts
│       ├── storage.controller.ts
│       └── app.module.ts
├── jest.config.ts
├── project.json
└── README.md
```

## Testing

### Unit Tests
```bash
# Run unit tests
nx test storage

# Run with coverage
nx test storage --coverage
```

### Integration Tests
```bash
# Requires MinIO/S3 and PostgreSQL running
nx test storage
```

## Test Coverage

The service includes comprehensive test coverage:

- **S3 Service Tests** (11 test cases)
  - Key generation and sanitization
  - Upload, download, delete operations
  - Signed URL generation
  - File existence checks
  - Metadata retrieval

- **File Service Tests** (12 test cases)
  - File upload with metadata
  - File retrieval and streaming
  - File deletion (soft delete)
  - Signed URL generation
  - File listing with filters
  - Virus scan status updates

- **Controller Tests** (15 test cases)
  - Upload endpoint validation
  - Download streaming
  - File deletion
  - Signed URL generation
  - File listing with pagination
  - Error handling

- **Health Service Tests** (6 test cases)
  - Database connectivity
  - S3 connectivity
  - Comprehensive health checks

- **Integration Tests** (10 test scenarios)
  - End-to-end file operations
  - Real S3/MinIO interaction
  - Database persistence

## Events

The service emits the following events:

### file.uploaded
```typescript
{
  fileId: string;
  userId: string;
  filename: string;
  size: number;
  mimeType: string;
  s3Key: string;
}
```

### file.deleted
```typescript
{
  fileId: string;
  userId: string;
  filename: string;
  s3Key: string;
}
```

### file.scanned
```typescript
{
  fileId: string;
  userId: string;
  status: 'pending' | 'clean' | 'infected' | 'failed';
  details?: string;
}
```

## Dependencies

### Core
- `@nestjs/common`, `@nestjs/core` - NestJS framework
- `@nestjs/config` - Configuration management
- `@nestjs/event-emitter` - Event system
- `@aws-sdk/client-s3` - S3 client
- `@aws-sdk/s3-request-presigner` - Signed URLs
- `@prisma/client` - Database ORM

### Development
- `@nestjs/testing` - Testing utilities
- `jest` - Test framework
- `supertest` - HTTP testing
- `@types/multer` - TypeScript types

## Usage Examples

### Upload a File
```typescript
const formData = new FormData();
formData.append('file', fileBuffer, 'document.pdf');
formData.append('description', 'Important document');
formData.append('tags', JSON.stringify(['work', 'legal']));

const response = await fetch('http://localhost:3008/api/files/upload', {
  method: 'POST',
  headers: {
    'x-user-id': 'user-123'
  },
  body: formData
});

const file = await response.json();
// { id, userId, filename, s3Key, metadata, ... }
```

### Generate Signed URL
```typescript
const response = await fetch('http://localhost:3008/api/files/signed-url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': 'user-123'
  },
  body: JSON.stringify({
    filename: 'upload.pdf',
    mimeType: 'application/pdf',
    size: 1024000
  })
});

const { url, fileId } = await response.json();
// Use url for direct S3 upload
```

### List Files
```typescript
const response = await fetch(
  'http://localhost:3008/api/files?page=1&limit=20&mimeType=image/&search=photo',
  {
    headers: { 'x-user-id': 'user-123' }
  }
);

const { files, total, totalPages } = await response.json();
```

## Security

- User isolation via `x-user-id` header (integrate with auth service)
- Signed URLs with expiration
- File size limits
- MIME type validation
- Virus scanning integration point
- Soft delete for audit trail

## Performance

- Streaming downloads (low memory footprint)
- Indexed database queries
- Efficient S3 operations
- Connection pooling
- Configurable signed URL caching

## Production Deployment

1. **Database Setup**
   ```bash
   # Run Prisma migrations
   npx prisma migrate deploy --schema=packages/storage/prisma/schema.prisma
   ```

2. **Environment Configuration**
   - Configure S3/MinIO credentials
   - Set up database connection
   - Configure file size limits

3. **Service Deployment**
   ```bash
   # Build the service
   nx build storage

   # Run in production
   NODE_ENV=production node dist/packages/storage/main.js
   ```

## Future Enhancements

- [ ] Image thumbnail generation
- [ ] Video transcoding support
- [ ] CDN integration
- [ ] File versioning
- [ ] Bulk upload/download
- [ ] File sharing with permissions
- [ ] Storage analytics
- [ ] Automated cleanup of orphaned files

## License

MIT

## Author

ORION Platform Team
