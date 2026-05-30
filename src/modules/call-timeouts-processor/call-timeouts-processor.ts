import { Processor, WorkerHost } from '@nestjs/bullmq';
import { CallLifecycleService } from '../call-lifecycle/call-lifecycle.service';
import { Job } from 'bullmq';
import { CallTimeoutsJobNames } from '../call-timeouts/call-timeouts-job-names';

@Processor('call-timeouts')
export class CallTimeoutsProcessor extends WorkerHost {
  constructor(private readonly callLifecycleService: CallLifecycleService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === CallTimeoutsJobNames.RingingTimeout) {
      const data = job.data as {
        roomId: string;
        calleeUserId: string;
      };

      await this.callLifecycleService.registerRingingTimeout(data);
      return;
    }

    if (job.name === CallTimeoutsJobNames.MaxDurationTimeout) {
      const data = job.data as {
        roomId: string;
        userId: string;
      };

      await this.callLifecycleService.registerMaxDurationEnd(data);
    }
  }
}
