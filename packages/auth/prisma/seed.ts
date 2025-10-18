/**
 * Auth Service - Database Seed Script
 * Seeds initial data for authentication service
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding auth service database...');

  // Seed sample devices
  const devices = await seedDevices();
  console.log(`✅ Created ${devices.length} sample devices`);

  // Seed rate limit configurations
  const rateLimits = await seedRateLimits();
  console.log(`✅ Created ${rateLimits.length} rate limit configurations`);

  console.log('✨ Auth service database seeded successfully!');
}

async function seedDevices() {
  // Create sample trusted devices for demo users
  const sampleUserIds = [
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
  ];

  const devicesData = [
    {
      userId: sampleUserIds[0],
      deviceId: crypto.randomUUID(),
      fingerprint: crypto.createHash('sha256').update('admin-device-1').digest('hex'),
      name: 'Admin MacBook Pro',
      type: 'desktop',
      os: 'macOS',
      osVersion: '14.0',
      browser: 'Chrome',
      browserVersion: '120.0',
      status: 'TRUSTED',
      isTrusted: true,
      isBlocked: false,
      lastIpAddress: '192.168.1.100',
      lastCountry: 'United States',
      lastCity: 'San Francisco',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      verifiedAt: new Date(),
    },
    {
      userId: sampleUserIds[1],
      deviceId: crypto.randomUUID(),
      fingerprint: crypto.createHash('sha256').update('user-device-1').digest('hex'),
      name: 'iPhone 15',
      type: 'mobile',
      os: 'iOS',
      osVersion: '17.2',
      browser: 'Safari',
      browserVersion: '17.0',
      status: 'TRUSTED',
      isTrusted: true,
      isBlocked: false,
      lastIpAddress: '192.168.1.101',
      lastCountry: 'United States',
      lastCity: 'New York',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15',
      verifiedAt: new Date(),
    },
  ];

  const createdDevices = [];
  for (const deviceData of devicesData) {
    const device = await prisma.device.upsert({
      where: { deviceId: deviceData.deviceId },
      update: deviceData,
      create: deviceData,
    });
    createdDevices.push(device);
  }

  return createdDevices;
}

async function seedRateLimits() {
  // Define rate limit configurations for different endpoints
  const rateLimitConfigs = [
    {
      key: 'global:login',
      keyType: 'endpoint',
      endpoint: '/api/auth/login',
      limit: 5,
      window: 60, // 1 minute
    },
    {
      key: 'global:refresh',
      keyType: 'endpoint',
      endpoint: '/api/auth/refresh',
      limit: 10,
      window: 60,
    },
    {
      key: 'global:password-reset',
      keyType: 'endpoint',
      endpoint: '/api/auth/password-reset',
      limit: 3,
      window: 300, // 5 minutes
    },
    {
      key: 'global:verify-email',
      keyType: 'endpoint',
      endpoint: '/api/auth/verify-email',
      limit: 5,
      window: 300,
    },
    {
      key: 'global:2fa-verify',
      keyType: 'endpoint',
      endpoint: '/api/auth/2fa/verify',
      limit: 5,
      window: 60,
    },
  ];

  const createdRateLimits = [];
  for (const config of rateLimitConfigs) {
    const rateLimit = await prisma.rateLimit.upsert({
      where: { key: config.key },
      update: {
        limit: config.limit,
        window: config.window,
      },
      create: {
        ...config,
        resetAt: new Date(Date.now() + config.window * 1000),
      },
    });
    createdRateLimits.push(rateLimit);
  }

  return createdRateLimits;
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
