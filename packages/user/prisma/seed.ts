/**
 * User Service - Database Seed Script
 * Seeds initial data for roles, permissions, and sample users
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding user service database...');

  // Seed permissions first
  const permissions = await seedPermissions();
  console.log(`✅ Created ${permissions.length} permissions`);

  // Seed roles
  const roles = await seedRoles();
  console.log(`✅ Created ${roles.length} roles`);

  // Assign permissions to roles
  await assignPermissionsToRoles(roles, permissions);
  console.log('✅ Assigned permissions to roles');

  // Seed sample users
  const users = await seedUsers();
  console.log(`✅ Created ${users.length} sample users`);

  // Assign roles to users
  await assignRolesToUsers(users, roles);
  console.log('✅ Assigned roles to users');

  console.log('✨ User service database seeded successfully!');
}

async function seedPermissions() {
  const permissionGroups = [
    // User Management Permissions
    {
      category: 'User Management',
      permissions: [
        { resource: 'users', action: 'read', name: 'users.read', displayName: 'View Users' },
        { resource: 'users', action: 'create', name: 'users.create', displayName: 'Create Users' },
        { resource: 'users', action: 'update', name: 'users.update', displayName: 'Update Users' },
        { resource: 'users', action: 'delete', name: 'users.delete', displayName: 'Delete Users' },
        { resource: 'users', action: 'manage', name: 'users.manage', displayName: 'Manage Users' },
      ],
    },
    // Role Management Permissions
    {
      category: 'Role Management',
      permissions: [
        { resource: 'roles', action: 'read', name: 'roles.read', displayName: 'View Roles' },
        { resource: 'roles', action: 'create', name: 'roles.create', displayName: 'Create Roles' },
        { resource: 'roles', action: 'update', name: 'roles.update', displayName: 'Update Roles' },
        { resource: 'roles', action: 'delete', name: 'roles.delete', displayName: 'Delete Roles' },
        { resource: 'roles', action: 'assign', name: 'roles.assign', displayName: 'Assign Roles' },
      ],
    },
    // Permission Management
    {
      category: 'Permission Management',
      permissions: [
        { resource: 'permissions', action: 'read', name: 'permissions.read', displayName: 'View Permissions' },
        { resource: 'permissions', action: 'grant', name: 'permissions.grant', displayName: 'Grant Permissions' },
        { resource: 'permissions', action: 'revoke', name: 'permissions.revoke', displayName: 'Revoke Permissions' },
      ],
    },
    // Content Management
    {
      category: 'Content Management',
      permissions: [
        { resource: 'content', action: 'read', name: 'content.read', displayName: 'View Content' },
        { resource: 'content', action: 'create', name: 'content.create', displayName: 'Create Content' },
        { resource: 'content', action: 'update', name: 'content.update', displayName: 'Update Content' },
        { resource: 'content', action: 'delete', name: 'content.delete', displayName: 'Delete Content' },
        { resource: 'content', action: 'publish', name: 'content.publish', displayName: 'Publish Content' },
      ],
    },
    // System Settings
    {
      category: 'System Management',
      permissions: [
        { resource: 'system', action: 'read', name: 'system.read', displayName: 'View System Settings' },
        { resource: 'system', action: 'configure', name: 'system.configure', displayName: 'Configure System' },
        { resource: 'audit', action: 'read', name: 'audit.read', displayName: 'View Audit Logs' },
      ],
    },
  ];

  const createdPermissions = [];
  for (const group of permissionGroups) {
    for (const perm of group.permissions) {
      const permission = await prisma.permission.upsert({
        where: { name: perm.name },
        update: {
          displayName: perm.displayName,
          resource: perm.resource,
          action: perm.action,
        },
        create: {
          name: perm.name,
          displayName: perm.displayName,
          description: `Permission to ${perm.action} ${perm.resource}`,
          resource: perm.resource,
          action: perm.action,
          category: group.category,
          scope: 'GLOBAL',
          isActive: true,
          isSystem: true,
        },
      });
      createdPermissions.push(permission);
    }
  }

  return createdPermissions;
}

async function seedRoles() {
  const rolesData = [
    {
      name: 'super_admin',
      displayName: 'Super Administrator',
      description: 'Full system access with all permissions',
      type: 'SYSTEM',
      scope: 'GLOBAL',
      level: 0,
      isSystem: true,
    },
    {
      name: 'admin',
      displayName: 'Administrator',
      description: 'Administrative access to manage users and content',
      type: 'SYSTEM',
      scope: 'GLOBAL',
      level: 1,
      isSystem: true,
    },
    {
      name: 'moderator',
      displayName: 'Moderator',
      description: 'Content moderation and user management',
      type: 'SYSTEM',
      scope: 'GLOBAL',
      level: 2,
      isSystem: true,
    },
    {
      name: 'editor',
      displayName: 'Editor',
      description: 'Content creation and editing',
      type: 'SYSTEM',
      scope: 'GLOBAL',
      level: 3,
      isSystem: true,
    },
    {
      name: 'user',
      displayName: 'User',
      description: 'Standard user access',
      type: 'SYSTEM',
      scope: 'GLOBAL',
      level: 4,
      isSystem: true,
    },
    {
      name: 'guest',
      displayName: 'Guest',
      description: 'Limited read-only access',
      type: 'SYSTEM',
      scope: 'GLOBAL',
      level: 5,
      isSystem: true,
    },
  ];

  const createdRoles = [];
  for (const roleData of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {
        displayName: roleData.displayName,
        description: roleData.description,
      },
      create: roleData,
    });
    createdRoles.push(role);
  }

  return createdRoles;
}

async function assignPermissionsToRoles(roles: any[], permissions: any[]) {
  // Super Admin gets all permissions
  const superAdmin = roles.find((r) => r.name === 'super_admin');
  if (superAdmin) {
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdmin.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: superAdmin.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Admin gets most permissions except system configuration
  const admin = roles.find((r) => r.name === 'admin');
  if (admin) {
    const adminPermissions = permissions.filter(
      (p) => !p.name.startsWith('system.configure')
    );
    for (const permission of adminPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: admin.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: admin.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Moderator gets user and content management
  const moderator = roles.find((r) => r.name === 'moderator');
  if (moderator) {
    const modPermissions = permissions.filter(
      (p) =>
        p.category === 'User Management' ||
        p.category === 'Content Management'
    );
    for (const permission of modPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: moderator.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: moderator.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // Editor gets content permissions
  const editor = roles.find((r) => r.name === 'editor');
  if (editor) {
    const editorPermissions = permissions.filter(
      (p) => p.category === 'Content Management'
    );
    for (const permission of editorPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: editor.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: editor.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // User gets read permissions
  const user = roles.find((r) => r.name === 'user');
  if (user) {
    const userPermissions = permissions.filter(
      (p) => p.action === 'read'
    );
    for (const permission of userPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: user.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: user.id,
          permissionId: permission.id,
        },
      });
    }
  }
}

async function seedUsers() {
  const usersData = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@orion.local',
      username: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      displayName: 'Admin',
      status: 'ACTIVE',
      isVerified: true,
      isActive: true,
      emailVerifiedAt: new Date(),
      timezone: 'UTC',
      locale: 'en',
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'user@orion.local',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      displayName: 'Test User',
      status: 'ACTIVE',
      isVerified: true,
      isActive: true,
      emailVerifiedAt: new Date(),
      timezone: 'UTC',
      locale: 'en',
    },
  ];

  const createdUsers = [];
  for (const userData of usersData) {
    const user = await prisma.user.upsert({
      where: { id: userData.id },
      update: {},
      create: {
        ...userData,
        preferences: {
          create: {
            notifications: {
              email: true,
              sms: false,
              push: true,
              inApp: true,
            },
            privacy: {
              profileVisibility: 'public',
              showEmail: false,
              showPhone: false,
              showLocation: true,
            },
            display: {
              theme: 'auto',
              language: 'en',
              dateFormat: 'MM/DD/YYYY',
              timeFormat: '12h',
            },
          },
        },
      },
    });
    createdUsers.push(user);
  }

  return createdUsers;
}

async function assignRolesToUsers(users: any[], roles: any[]) {
  const admin = users.find((u) => u.username === 'admin');
  const superAdminRole = roles.find((r) => r.name === 'super_admin');

  if (admin && superAdminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: admin.id,
          roleId: superAdminRole.id,
        },
      },
      update: {},
      create: {
        userId: admin.id,
        roleId: superAdminRole.id,
      },
    });
  }

  const testUser = users.find((u) => u.username === 'testuser');
  const userRole = roles.find((r) => r.name === 'user');

  if (testUser && userRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: testUser.id,
          roleId: userRole.id,
        },
      },
      update: {},
      create: {
        userId: testUser.id,
        roleId: userRole.id,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
