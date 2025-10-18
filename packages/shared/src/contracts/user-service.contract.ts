/**
 * User Service API Contract
 *
 * Defines the interface for the User Service that other services can depend on.
 */

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    showEmail: boolean;
    showLocation: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
  };
}

export interface UserSearchResult {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  location?: string;
}

export interface PaginatedUserSearchResponse {
  data: UserSearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * User Service endpoints (for internal service-to-service communication)
 */
export const USER_SERVICE_ENDPOINTS = {
  GET_USER: '/api/v1/users/:id',
  GET_CURRENT_USER: '/api/v1/users/me',
  UPDATE_USER: '/api/v1/users/:id',
  DELETE_USER: '/api/v1/users/:id',
  SEARCH_USERS: '/api/v1/users/search',
  UPLOAD_AVATAR: '/api/v1/users/:id/avatar',
  GET_PREFERENCES: '/api/v1/users/:id/preferences',
  UPDATE_PREFERENCES: '/api/v1/users/:id/preferences',
} as const;
