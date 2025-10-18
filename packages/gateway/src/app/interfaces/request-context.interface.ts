import { Request } from 'express';

export interface UserContext {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RequestContext extends Request {
  correlationId?: string;
  user?: UserContext;
  startTime?: number;
}

export interface ValidatedToken {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}
