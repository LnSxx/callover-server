import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { CallLogsService } from './call-logs.service';
import { ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GetCallLogsQueryDto } from './dto/get-call-logs-query.dto';
import { GetCallLogsResponseDto } from './dto/get-call-logs-response.dto';
import { CallLogDocument } from './schemas/call-log.schema';
import { CallLogDto } from './dto/call-log.dto';
import { CallLogStatus } from './types/call-logs.types';
import { CallDirection, CallType } from '../../entities/call';

@Controller('call-logs')
export class CallLogsController {
  constructor(private readonly callLogsService: CallLogsService) {}

  @Get()
  @ApiQuery({ name: 'peerUserId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
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
  @ApiQuery({ name: 'startedAfter', required: false, type: String })
  @ApiQuery({ name: 'startedBefore', required: false, type: String })
  async get(
    @CurrentUser() user: { id: string },
    @Query() query: GetCallLogsQueryDto,
  ): Promise<GetCallLogsResponseDto> {
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;

    const startedAfter = this.parseDateQuery(
      query.startedAfter,
      'startedAfter',
    );

    const startedBefore = this.parseDateQuery(
      query.startedBefore,
      'startedBefore',
    );

    if (startedAfter && startedBefore && startedAfter > startedBefore) {
      throw new BadRequestException(
        'startedAfter must be earlier than or equal to startedBefore',
      );
    }

    const result = await this.callLogsService.get({
      userId: user.id,
      peerUserId: query.peerUserId,
      limit,
      offset,
      status: query.status,
      type: query.type,
      direction: query.direction,
      startedAfter,
      startedBefore,
    });

    return {
      data: result.data.map((callLog) => this.toCallLogDto(callLog)),
      pagination: {
        limit: result.limit,
        offset: result.offset,
        count: result.count,
        total: result.total,
        next: this.buildPaginationUrl({
          limit,
          offset: offset + limit,
          peerUserId: query.peerUserId,
          status: query.status,
          type: query.type,
          direction: query.direction,
          startedAfter: query.startedAfter,
          startedBefore: query.startedBefore,
          shouldBuild: offset + result.count < result.total,
        }),
        previous: this.buildPaginationUrl({
          limit,
          offset: Math.max(0, offset - limit),
          peerUserId: query.peerUserId,
          status: query.status,
          type: query.type,
          direction: query.direction,
          startedAfter: query.startedAfter,
          startedBefore: query.startedBefore,
          shouldBuild: offset > 0,
        }),
      },
    };
  }

  private toCallLogDto(callLog: CallLogDocument): CallLogDto {
    return {
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
      updatedAt: callLog.updatedAt.toISOString(),
    };
  }

  private buildPaginationUrl(params: {
    limit: number;
    offset: number;
    peerUserId?: string;
    status?: CallLogStatus;
    type?: CallType;
    direction?: CallDirection;
    startedAfter?: string;
    startedBefore?: string;
    shouldBuild: boolean;
  }): string | null {
    if (!params.shouldBuild) {
      return null;
    }

    const searchParams = new URLSearchParams();

    searchParams.set('limit', params.limit.toString());
    searchParams.set('offset', params.offset.toString());

    if (params.peerUserId) {
      searchParams.set('peerUserId', params.peerUserId);
    }

    if (params.status) {
      searchParams.set('status', params.status);
    }

    if (params.type) {
      searchParams.set('type', params.type);
    }

    if (params.direction) {
      searchParams.set('direction', params.direction);
    }

    if (params.startedAfter) {
      searchParams.set('startedAfter', params.startedAfter);
    }

    if (params.startedBefore) {
      searchParams.set('startedBefore', params.startedBefore);
    }

    return `/call-logs?${searchParams.toString()}`;
  }

  private parseDateQuery(
    value: string | undefined,
    fieldName: string,
  ): Date | undefined {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid ISO date`);
    }

    return date;
  }
}
