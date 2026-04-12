import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CURRENT_USER_ID_KEY = 'userId';

/**
 * Extracts the authenticated user ID set by JwtAuthGuard.
 * Usage: `@CurrentUserId() userId: string`
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request as Request & { userId: string }).userId;
  },
);
