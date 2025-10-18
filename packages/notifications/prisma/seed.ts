/**
 * Notification Service - Database Seed Script
 * Seeds initial data for notification templates and configurations
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding notification service database...');

  // Seed notification templates
  const templates = await seedTemplates();
  console.log(`✅ Created ${templates.length} notification templates`);

  // Seed sample user preferences
  const preferences = await seedUserPreferences();
  console.log(`✅ Created ${preferences.length} user preferences`);

  console.log('✨ Notification service database seeded successfully!');
}

async function seedTemplates() {
  const templates = [
    // Email Templates
    {
      name: 'welcome_email',
      displayName: 'Welcome Email',
      description: 'Welcome email sent to new users',
      category: 'ACCOUNT',
      channel: 'EMAIL',
      priority: 'NORMAL',
      subject: 'Welcome to {{appName}}!',
      body: `
Hello {{userName}},

Welcome to {{appName}}! We're excited to have you on board.

To get started:
1. Complete your profile
2. Explore our features
3. Connect with others

If you have any questions, feel free to reach out to our support team.

Best regards,
The {{appName}} Team
      `.trim(),
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .button { display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to {{appName}}!</h1>
    </div>
    <div class="content">
      <p>Hello {{userName}},</p>
      <p>We're excited to have you on board!</p>
      <p>To get started:</p>
      <ul>
        <li>Complete your profile</li>
        <li>Explore our features</li>
        <li>Connect with others</li>
      </ul>
      <p><a href="{{dashboardUrl}}" class="button">Go to Dashboard</a></p>
    </div>
  </div>
</body>
</html>
      `.trim(),
      variables: ['userName', 'appName', 'dashboardUrl'],
      locale: 'en',
      isActive: true,
      isPublic: false,
    },
    {
      name: 'password_reset',
      displayName: 'Password Reset',
      description: 'Password reset request email',
      category: 'SECURITY',
      channel: 'EMAIL',
      priority: 'HIGH',
      subject: 'Reset Your Password',
      body: `
Hello {{userName}},

We received a request to reset your password. Click the link below to create a new password:

{{resetUrl}}

This link will expire in {{expiryMinutes}} minutes.

If you didn't request this, please ignore this email.

Best regards,
The {{appName}} Team
      `.trim(),
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert { background: #ff9800; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .button { display: inline-block; padding: 12px 24px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert">
      <strong>Password Reset Request</strong>
    </div>
    <p>Hello {{userName}},</p>
    <p>We received a request to reset your password.</p>
    <p><a href="{{resetUrl}}" class="button">Reset Password</a></p>
    <p>This link will expire in {{expiryMinutes}} minutes.</p>
    <p>If you didn't request this, please ignore this email.</p>
  </div>
</body>
</html>
      `.trim(),
      variables: ['userName', 'appName', 'resetUrl', 'expiryMinutes'],
      locale: 'en',
      isActive: true,
      isPublic: false,
    },
    {
      name: 'email_verification',
      displayName: 'Email Verification',
      description: 'Email address verification',
      category: 'SECURITY',
      channel: 'EMAIL',
      priority: 'HIGH',
      subject: 'Verify Your Email Address',
      body: `
Hello {{userName}},

Please verify your email address by clicking the link below:

{{verificationUrl}}

This link will expire in {{expiryMinutes}} minutes.

Best regards,
The {{appName}} Team
      `.trim(),
      variables: ['userName', 'appName', 'verificationUrl', 'expiryMinutes'],
      locale: 'en',
      isActive: true,
      isPublic: false,
    },
    // SMS Templates
    {
      name: 'two_factor_sms',
      displayName: 'Two-Factor Authentication Code',
      description: 'SMS with 2FA verification code',
      category: 'SECURITY',
      channel: 'SMS',
      priority: 'URGENT',
      subject: null,
      body: 'Your {{appName}} verification code is: {{code}}. Valid for {{expiryMinutes}} minutes.',
      variables: ['appName', 'code', 'expiryMinutes'],
      locale: 'en',
      isActive: true,
      isPublic: false,
    },
    // Push Notification Templates
    {
      name: 'new_message',
      displayName: 'New Message Notification',
      description: 'Push notification for new messages',
      category: 'SOCIAL',
      channel: 'PUSH',
      priority: 'NORMAL',
      subject: 'New message from {{senderName}}',
      body: '{{messagePreview}}',
      variables: ['senderName', 'messagePreview'],
      locale: 'en',
      isActive: true,
      isPublic: false,
    },
    // System Notifications
    {
      name: 'system_maintenance',
      displayName: 'System Maintenance Notice',
      description: 'Notification about scheduled maintenance',
      category: 'SYSTEM',
      channel: 'EMAIL',
      priority: 'HIGH',
      subject: 'Scheduled Maintenance - {{maintenanceDate}}',
      body: `
Hello {{userName}},

This is to inform you that we have scheduled system maintenance:

Date: {{maintenanceDate}}
Duration: {{duration}}
Impact: {{impact}}

We apologize for any inconvenience.

Best regards,
The {{appName}} Team
      `.trim(),
      variables: ['userName', 'appName', 'maintenanceDate', 'duration', 'impact'],
      locale: 'en',
      isActive: true,
      isPublic: false,
    },
  ];

  const createdTemplates = [];
  for (const template of templates) {
    const created = await prisma.template.upsert({
      where: { name: template.name },
      update: template,
      create: template,
    });
    createdTemplates.push(created);
  }

  return createdTemplates;
}

async function seedUserPreferences() {
  // Create sample user preferences (for demonstration)
  const sampleUserIds = [
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
  ];

  const preferences = [];
  for (const userId of sampleUserIds) {
    const pref = await prisma.userPreference.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        inAppEnabled: true,
        webhookEnabled: false,
        emailPreferences: {
          transactional: true,
          marketing: true,
          security: true,
          system: true,
        },
        pushPreferences: {
          messages: true,
          mentions: true,
          updates: false,
        },
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        quietHoursTimezone: 'UTC',
        locale: 'en',
        timezone: 'UTC',
      },
    });
    preferences.push(pref);
  }

  return preferences;
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
