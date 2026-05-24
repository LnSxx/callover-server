import { Module } from '@nestjs/common';
import { CallsService } from './calls.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [CallsService],
  exports: [CallsService],
})
export class CallsModule {}
