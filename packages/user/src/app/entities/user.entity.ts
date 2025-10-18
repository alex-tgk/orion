import { User as PrismaUser } from '@prisma/client';

export class UserEntity implements PrismaUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
