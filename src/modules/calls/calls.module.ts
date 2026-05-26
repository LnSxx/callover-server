import { Module } from '@nestjs/common';
import { CallsService } from './calls.service';
import { RedisModule } from '../redis/redis.module';
import { CallsController } from './calls.controller';

@Module({
  imports: [RedisModule],
  providers: [CallsService],
  controllers: [CallsController],
  exports: [CallsService],
})
export class CallsModule {}
