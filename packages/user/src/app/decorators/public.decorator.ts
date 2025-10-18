import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../guards/jwt-auth.guard';

/**
 * Mark a route as public (no JWT authentication required)
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
