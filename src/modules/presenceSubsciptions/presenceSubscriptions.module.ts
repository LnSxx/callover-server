import { Module } from '@nestjs/common';
import { PresenceSubscriptionsService } from './presenceSubscriptions.service';

@Module({
  providers: [PresenceSubscriptionsService],
  exports: [PresenceSubscriptionsService],
})
export class PresenceSubscriptionsModule {}
