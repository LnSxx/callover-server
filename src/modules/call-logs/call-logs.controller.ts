import { Controller, Get, Query } from '@nestjs/common';
import { CallLogsService } from './call-logs.service';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GetCallLogsQueryDto } from './dto/get-call-logs-query.dto';
import { GetCallLogsResponseDto } from './dto/get-call-logs-response.dto';
import { CallLogDocument } from './schemas/call-log.schema';
import { CallLogDto } from './dto/call-log.dto';

@ApiTags('Call Logs')
@Controller('call-logs')
export class CallLogsController {
  constructor(private readonly callLogsService: CallLogsService) {}

  @Get()
  @ApiQuery({ name: 'peerUserId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    enum: [
      'completed',
      'missed',
      'declined',
      'cancelled',
      'no_answer',
      'failed',
    ],
  })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    enum: ['audio', 'video'],
  })
  @ApiQuery({
    name: 'direction',
    required: false,
    type: String,
    enum: ['incoming', 'outgoing'],
  })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async get(
    @CurrentUser() user: { id: string },
    @Query() query: GetCallLogsQueryDto,
  ): Promise<GetCallLogsResponseDto> {
    const limit = query.limit ?? 100;

    const result = await this.callLogsService.get({
      userId: user.id,
      peerUserId: query.peerUserId,
      limit,
      status: query.status,
      type: query.type,
      direction: query.direction,
      cursor: query.cursor,
    });

    return {
      data: result.data.map((callLog) => this.toCallLogDto(callLog)),
      nextCursor: result.nextCursor,
    };
  }

  private toCallLogDto(callLog: CallLogDocument): CallLogDto {
    return {
      id: callLog._id.toString(),
      callId: callLog.callId,
      userId: callLog.userId.toString(),
      peerUserId: callLog.peerUserId.toString(),
      peerUserName: callLog.peerUserName,
      startedAt: callLog.startedAt.toISOString(),
      answeredAt: callLog.answeredAt?.toISOString(),
      endedAt: callLog.endedAt?.toISOString(),
      direction: callLog.direction,
      type: callLog.type,
      status: callLog.status,
      durationSeconds: callLog.durationSeconds,
      ringingDurationSeconds: callLog.ringingDurationSeconds,
      createdAt: callLog.createdAt.toISOString(),
    };
  }
}
