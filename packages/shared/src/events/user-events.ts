/**
 * User Service Event Definitions
 *
 * These events are published by the User Service and consumed by other services.
 */

export interface UserCreatedEvent {
  eventId: string;
  userId: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface UserUpdatedEvent {
  eventId: string;
  userId: string;
  changes: string[]; // Array of changed field names
  updatedAt: Date;
}

export interface UserDeletedEvent {
  eventId: string;
  userId: string;
  deletedAt: Date;
}

export interface UserVerifiedEvent {
  eventId: string;
  userId: string;
  email: string;
  verifiedAt: Date;
}

export interface UserPreferencesUpdatedEvent {
  eventId: string;
  userId: string;
  preferences: {
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
    privacy?: {
      profileVisibility?: 'public' | 'private' | 'friends';
      showEmail?: boolean;
      showLocation?: boolean;
    };
    display?: {
      theme?: 'light' | 'dark' | 'auto';
      language?: string;
    };
  };
  updatedAt: Date;
}

// Event names for RabbitMQ routing
export const USER_EVENT_PATTERNS = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_VERIFIED: 'user.verified',
  USER_PREFERENCES_UPDATED: 'user.preferences.updated',
} as const;
