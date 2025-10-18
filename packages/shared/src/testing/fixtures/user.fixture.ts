/**
 * User entity fixtures for testing
 */
export class UserFixture {
  static createUser(overrides?: Partial<any>) {
    return {
      id: 'user-123',
      email: 'user@orion.test',
      password: '$2b$10$XQZQYYfXYfXYfXYfXYfXYeQ', // hashed 'password123'
      firstName: 'John',
      lastName: 'Doe',
      role: 'user',
      isActive: true,
      isEmailVerified: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      lastLoginAt: null,
      ...overrides,
    };
  }

  static createAdmin(overrides?: Partial<any>) {
    return this.createUser({
      id: 'admin-123',
      email: 'admin@orion.test',
      role: 'admin',
      ...overrides,
    });
  }

  static createUnverifiedUser(overrides?: Partial<any>) {
    return this.createUser({
      id: 'unverified-123',
      email: 'unverified@orion.test',
      isEmailVerified: false,
      ...overrides,
    });
  }

  static createInactiveUser(overrides?: Partial<any>) {
    return this.createUser({
      id: 'inactive-123',
      email: 'inactive@orion.test',
      isActive: false,
      ...overrides,
    });
  }

  static createBulkUsers(count: number): any[] {
    return Array.from({ length: count }, (_, i) =>
      this.createUser({
        id: `user-${i}`,
        email: `user${i}@orion.test`,
      })
    );
  }
}
