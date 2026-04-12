import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import type { UserMeDto } from '@parinator/schema';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';

interface PatchUserMeBody {
  displayName?: unknown;
}

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
    @Body() body: PatchUserMeBody,
  ): Promise<UserMeDto> {
    const displayName = this.validateDisplayName(body.displayName);
    return this.usersService.updateDisplayName(userId, displayName);
  }

  private validateDisplayName(value: unknown): string {
    if (typeof value !== 'string') {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Display name must be a non-empty string.',
          details: {},
        },
      });
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Display name must not be empty.',
          details: {},
        },
      });
    }
    if (trimmed.length > 100) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Display name must be at most 100 characters.',
          details: {},
        },
      });
    }
    return trimmed;
  }
}
