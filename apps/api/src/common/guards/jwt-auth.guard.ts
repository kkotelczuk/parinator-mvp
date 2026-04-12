import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../../supabase/supabase.service';

/**
 * Verifies the Supabase JWT from the Authorization header and attaches
 * `userId` to the request object for downstream handlers.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.', details: {} },
      });
    }
    const { data, error } = await this.supabaseService.getClient().auth.getUser(token);
    if (error || !data.user) {
      throw new UnauthorizedException({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.', details: {} },
      });
    }
    (request as Request & { userId: string }).userId = data.user.id;
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) return undefined;
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return undefined;
    return token;
  }
}
