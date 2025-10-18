/**
 * Auth Service Event Definitions
 *
 * These events are published by the Auth Service and consumed by other services.
 */

export interface PasswordResetRequestedEvent {
  eventId: string;
  userId: string;
  email: string;
  resetToken: string;
  expiresAt: Date;
  requestedAt: Date;
}

export interface PasswordChangedEvent {
  eventId: string;
  userId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  changedAt: Date;
}

export interface SuspiciousLoginEvent {
  eventId: string;
  userId: string;
  email: string;
  ipAddress: string;
  location: string;
  userAgent: string;
  reason: string; // Why it was flagged as suspicious
  timestamp: Date;
}

export interface LoginSuccessEvent {
  eventId: string;
  userId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface LogoutEvent {
  eventId: string;
  userId: string;
  timestamp: Date;
}

// Event names for RabbitMQ routing
export const AUTH_EVENT_PATTERNS = {
  PASSWORD_RESET_REQUESTED: 'auth.password-reset-requested',
  PASSWORD_CHANGED: 'auth.password-changed',
  SUSPICIOUS_LOGIN: 'auth.suspicious-login',
  LOGIN_SUCCESS: 'auth.login-success',
  LOGOUT: 'auth.logout',
} as const;
