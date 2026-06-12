import { Body, Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CallsService } from './calls.service';
import { Call } from '../../entities/call';
import { CallDto } from './dto/call.dto';
import { GetCurrentRingingCallResponseDto } from './dto/get-current-ringing-call-response.dto';
import { PendingIceCandidate } from '../../entities/pending-ice-candidate';
import { PendingIceCandidateDto } from './dto/pending-ice-candidate.dto';

@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get('current')
  async getCurrentRingingCall(
    @CurrentUser() user: { id: string },
  ): Promise<GetCurrentRingingCallResponseDto> {
    const result = await this.callsService.getCurrentRingingCall(user.id);

    return {
      call: result.call ? this.toCallDto(result.call) : null,
      pendingIceCandidates: result.pendingIceCandidates.map((candidate) =>
        this.toPendingIceCandidateDto(candidate),
      ),
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

  private toPendingIceCandidateDto(
    candidate: PendingIceCandidate,
  ): PendingIceCandidateDto {
    return {
      fromUserId: candidate.fromUserId,
      sdp: candidate.sdp,
      sdpMLineIndex: candidate.sdpMLineIndex,
      sdpMid: candidate.sdpMid,
      createdAt: candidate.createdAt.toISOString(),
    };
  }
}
