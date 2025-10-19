module.exports = {
  apps: [
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

    // Backend services - Run these with `pnpm nx serve <service>` instead
    // They require PostgreSQL and Redis to be running
    //
    // Auth service:
    //   pnpm nx serve auth
    //   Requires: PostgreSQL on port 5432, Redis on port 6379
    //
    // Gateway service:
    //   pnpm nx serve gateway
    //
    // AI Wrapper service:
    //   pnpm nx serve ai-wrapper
    //   (after building with: pnpm nx build ai-wrapper)
  ]
};
