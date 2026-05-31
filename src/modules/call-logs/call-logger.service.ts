import { Injectable } from '@nestjs/common';
import { CallLogsService } from './call-logs.service';
import { CallLogStatus } from './types/call-logs.types';
import { Call } from '../../entities/call';

@Injectable()
export class CallLoggerService {
  constructor(private readonly callLogsService: CallLogsService) {}

  async writeCallLog(params: {
    call: Call;
    status: CallLogStatus;
    endedAt: Date;
    answeredAt?: Date;
  }): Promise<void> {
    await this.callLogsService.createCallLog({
      callId: params.call.roomId,
      userId: params.call.userId,
      peerUserId: params.call.peerUserId,
      startedAt: params.call.createdAt,
      answeredAt: params.answeredAt,
      endedAt: params.endedAt,
      direction: params.call.direction,
      type: params.call.type,
      status: params.status,
    });
  }

  async writePair(params: {
    caller: {
      call: Call;
      status: CallLogStatus;
      answeredAt?: Date;
    };
    callee: {
      call: Call;
      status: CallLogStatus;
      answeredAt?: Date;
    };
    endedAt: Date;
  }): Promise<void> {
    await Promise.all([
      this.writeCallLog({
        call: params.caller.call,
        status: params.caller.status,
        endedAt: params.endedAt,
        answeredAt: params.caller.answeredAt,
      }),
      this.writeCallLog({
        call: params.callee.call,
        status: params.callee.status,
        endedAt: params.endedAt,
        answeredAt: params.callee.answeredAt,
      }),
    ]);
  }
}
