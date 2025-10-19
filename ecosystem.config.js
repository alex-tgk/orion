module.exports = {
  apps: [
    // Backend services (NestJS)
    {
      name: 'auth',
      script: 'main.js',
      cwd: './dist/packages/auth',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        PORT: 3010,
        NODE_ENV: 'production',
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/orion',
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379'
      }
    },
    {
      name: 'gateway',
      script: 'main.js',
      cwd: './dist/packages/gateway',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        PORT: 3100,
        NODE_ENV: 'production'
      }
    },

    // Frontend applications (served with static file server)
    {
      name: 'admin-ui',
      script: 'npx',
      args: 'serve -s dist -l 3000',
      cwd: './packages/admin-ui',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'document-intelligence',
      script: 'npx',
      args: 'serve -s dist -l 3001',
      cwd: './packages/document-intelligence-demo',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }

    // Note: AI Wrapper service requires build first
    // Run: pnpm nx build ai-wrapper
    // Then uncomment:
    // {
    //   name: 'ai-wrapper',
    //   script: 'main.js',
    //   cwd: './dist/packages/ai-wrapper',
    //   instances: 1,
    //   autorestart: true,
    //   watch: false,
    //   max_memory_restart: '300M',
    //   env: {
    //     PORT: 3200,
    //     NODE_ENV: 'production'
    //   }
    // }
  ]
};
