import { Body, Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CallsService } from './calls.service';
import { Call } from './entities/call';
import { CallDto } from './dto/call.dto';
import { GetCurrentCallResponseDto } from './dto/get-current-call-response.dto';

@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get('current')
  async getCurrentCall(
    @CurrentUser() user: { id: string },
  ): Promise<GetCurrentCallResponseDto> {
    const call = await this.callsService.getCall(user.id);

    return {
      call: call ? this.toCallDto(call) : null,
    };
  }

  private toCallDto(call: Call): CallDto {
    return {
      type: call.type,
      userId: call.userId,
      socketId: call.socketId,
      peerUserId: call.peerUserId,
      peerSocketId: call.peerSocketId,
      roomId: call.roomId,
      status: call.status,
      createdAt: call.createdAt.toISOString(),
      acceptedAt: call.acceptedAt?.toISOString(),
    };
  }
}
