import { Module } from '@nestjs/common';
import { PresenceSubscriptionsService } from './presence-subscriptions.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [PresenceSubscriptionsService],
  exports: [PresenceSubscriptionsService],
})
export class PresenceSubscriptionsModule {}
