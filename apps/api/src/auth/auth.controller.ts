import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  loginSchema,
  uuidParamSchema,
  type AuthContextCommand,
  type AuthContextResponseDto,
  type LoginInput,
} from '@parinator/schema';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
type LoginResponse = {
  accessToken: string;
  userId: string;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: unknown): Promise<LoginResponse> {
    const validatedBody = this.validateLoginPayload(body);
    return this.authService.signIn(validatedBody.email, validatedBody.password);
  }

  @Get('context')
  @UseGuards(JwtAuthGuard)
  async getContext(@CurrentUserId() userId: string): Promise<AuthContextResponseDto> {
    return this.authService.getContext(userId);
  }

  @Post('context')
  @UseGuards(JwtAuthGuard)
  async setContext(
    @CurrentUserId() userId: string,
    @Body() body: unknown,
  ): Promise<AuthContextResponseDto> {
    const validatedBody = this.validateContextPayload(body);
    return this.authService.setContext(userId, validatedBody);
  }

  private validateLoginPayload(body: unknown): LoginInput {
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: result.error.issues[0]?.message ?? 'Invalid payload.',
          details: {},
        },
      });
    }
    return result.data;
  }

  private validateContextPayload(body: unknown): AuthContextCommand {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid payload.', details: {} },
      });
    }
    const payload = body as Record<string, unknown>;
    const teamIdResult = uuidParamSchema.safeParse(payload.teamId);
    const membershipIdResult = uuidParamSchema.safeParse(payload.membershipId);
    if (!teamIdResult.success || !membershipIdResult.success) {
      throw new BadRequestException({
        error: { code: 'VALIDATION_ERROR', message: 'teamId and membershipId must be valid UUIDs.', details: {} },
      });
    }
    return {
      teamId: teamIdResult.data,
      membershipId: membershipIdResult.data,
    };
  }
}
