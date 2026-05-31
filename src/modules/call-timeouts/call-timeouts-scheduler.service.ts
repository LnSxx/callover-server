import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CallTimeoutsJobNames } from './call-timeouts-job-names';

@Injectable()
export class CallTimeoutsSchedulerService {
  constructor(@InjectQueue('call-timeouts') private queue: Queue) {}

  async scheduleRingingTimeout(params: {
    roomId: string;
    calleeUserId: string;
    delayMs: number;
  }): Promise<void> {
    await this.queue.add(
      CallTimeoutsJobNames.RingingTimeout,
      {
        roomId: params.roomId,
        calleeUserId: params.calleeUserId,
      },
      {
        delay: params.delayMs,
        removeOnComplete: true,
        removeOnFail: 1000,
        jobId: `ringing-timeout-${params.roomId}`,
      },
    );
  }

  async scheduleMaxDurationTimeout(params: {
    roomId: string;
    participantUserId: string;
    delayMs: number;
  }): Promise<void> {
    await this.queue.add(
      CallTimeoutsJobNames.MaxDurationTimeout,
      {
        roomId: params.roomId,
        participantUserId: params.participantUserId,
      },
      {
        delay: params.delayMs,
        removeOnComplete: true,
        removeOnFail: 1000,
        jobId: `max-duration-${params.roomId}`,
      },
    );
  }
}
