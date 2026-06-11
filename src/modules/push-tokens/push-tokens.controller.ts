import { Body, Controller, Delete, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PushTokensService } from './push-tokens.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { DeletePushTokenDto } from './dto/delete-push-token.dto';

@ApiTags('Push Tokens')
@Controller('push-tokens')
export class PushTokensController {
  constructor(private readonly pushTokensService: PushTokensService) {}

  @Post()
  @HttpCode(200)
  @ApiOkResponse({
    schema: {
      example: {
        saved: true,
      },
    },
  })
  async save(
    @CurrentUser() user: { id: string },
    @Body() dto: RegisterPushTokenDto,
  ): Promise<{ saved: boolean }> {
    return this.pushTokensService.save({
      userId: user.id,
      provider: dto.provider,
      platform: dto.platform,
      token: dto.token,
      bundleId: dto.bundleId,
      deviceId: dto.deviceId,
      appVersion: dto.appVersion,
    });
  }

  @Delete('current')
  @HttpCode(200)
  @ApiOkResponse({
    schema: {
      example: {
        isDeleted: true,
      },
    },
  })
  async deleteCurrent(
    @CurrentUser() user: { id: string },
    @Body() dto: DeletePushTokenDto,
  ): Promise<{ isDeleted: boolean }> {
    return this.pushTokensService.deleteToken({
      userId: user.id,
      provider: dto.provider,
      token: dto.token,
    });
  }
}
