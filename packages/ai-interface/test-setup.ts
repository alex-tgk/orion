// Test setup file for AI Interface Service
// Mock environment variables for tests

process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.AI_CACHE_ENABLED = 'false';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
