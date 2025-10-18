import { UserPreferences as PrismaUserPreferences } from '@prisma/client';
import { Prisma } from '@prisma/client';

export class UserPreferencesEntity implements PrismaUserPreferences {
  id: string;
  userId: string;
  notifications: Prisma.JsonValue;
  privacy: Prisma.JsonValue;
  display: Prisma.JsonValue;
  updatedAt: Date;
}
