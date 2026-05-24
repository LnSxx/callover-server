import { Module } from '@nestjs/common';
import { PresenceSubscriptionsService } from './presenceSubscriptions.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [PresenceSubscriptionsService],
  exports: [PresenceSubscriptionsService],
})
export class PresenceSubscriptionsModule {}
