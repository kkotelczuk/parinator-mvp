import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  redeemJoinCodeSchema,
  type JoinCodeRedeemResponseDto,
} from '@parinator/schema';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JoinCodesService } from './join-codes.service';

@Controller('join-codes')
@UseGuards(JwtAuthGuard)
export class JoinCodesRedeemController {
  constructor(private readonly joinCodesService: JoinCodesService) {}

  /** POST /api/v1/join-codes/redeem — Join team/tournament using code (any authenticated user). */
  @Post('redeem')
  @HttpCode(HttpStatus.OK)
  async redeemJoinCode(
    @CurrentUserId() userId: string,
    @Body() body: unknown,
  ): Promise<JoinCodeRedeemResponseDto> {
    const result = redeemJoinCodeSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        error: { code: 'VALIDATION_ERROR', message: result.error.issues[0]?.message ?? 'Invalid payload.', details: {} },
      });
    }
    return this.joinCodesService.redeemJoinCode({
      actorUserId: userId,
      code: result.data.code,
    });
  }
}
