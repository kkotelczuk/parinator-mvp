import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { loginSchema, type LoginInput } from '@parinator/schema';
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
}
