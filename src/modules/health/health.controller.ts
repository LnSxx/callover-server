import { Controller, Get, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';
import type { RedisClientType } from 'redis';
import { REDIS_CLIENT } from '../redis/redis.provider';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection()
    private readonly mongoConnection: Connection,

    @Inject(REDIS_CLIENT)
    private readonly redisClient: RedisClientType,
  ) {}

  @Get()
  async getHealth() {
    const mongo =
      this.mongoConnection.readyState === ConnectionStates.connected
        ? 'ok'
        : 'error';

    let redis = 'error';

    try {
      if (this.redisClient.isOpen && this.redisClient.isReady) {
        const pong = await this.redisClient.ping();
        redis = pong === 'PONG' ? 'ok' : 'error';
      }
    } catch {
      redis = 'error';
    }

    return {
      status: mongo === 'ok' && redis === 'ok' ? 'ok' : 'degraded',
      mongo,
      redis,
      timestamp: new Date().toISOString(),
    };
  }
}
