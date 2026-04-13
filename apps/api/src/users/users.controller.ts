import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { patchUserMeSchema, type PatchUserMeInput, type UserMeDto } from '@parinator/schema';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** GET /api/v1/users/me — Read own profile. */
  @Get('me')
  async getMe(@CurrentUserId() userId: string): Promise<UserMeDto> {
    return this.usersService.findById(userId);
  }

  /** PATCH /api/v1/users/me — Update own display name. */
  @Patch('me')
  async updateMe(
    @CurrentUserId() userId: string,
    @Body() body: unknown,
  ): Promise<UserMeDto> {
    const validatedBody = this.validateUpdateMePayload(body);
    return this.usersService.updateDisplayName(userId, validatedBody.displayName);
  }

  private validateUpdateMePayload(body: unknown): PatchUserMeInput {
    const result = patchUserMeSchema.safeParse(body);
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
