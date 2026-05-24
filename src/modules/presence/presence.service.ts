import { Inject, Injectable } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { REDIS_CLIENT } from '../redis/redis.provider';

@Injectable()
export class PresenceService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: RedisClientType,
  ) {}

  private userSocketsKey(userId: string): string {
    return `presence:user:${userId}:sockets`;
  }

  private socketUserKey(socketId: string): string {
    return `presence:socket:${socketId}:user`;
  }

  async markSocketOnline(userId: string, socketId: string): Promise<void> {
    const socketKey = this.socketUserKey(socketId);
    const userSocketsKey = this.userSocketsKey(userId);

    const hasRegisteredSocket = await this.redis.exists(socketKey);

    if (hasRegisteredSocket) {
      return;
    }

    await this.redis
      .multi()
      .sAdd(userSocketsKey, socketId)
      .set(socketKey, userId)
      .sAdd('presence:online_users', userId)
      .exec();
  }

  async markSocketOffline(socketId: string): Promise<{
    userId: string | null;
    becameOffline: boolean;
  }> {
    const socketKey = this.socketUserKey(socketId);
    const userId = await this.redis.get(socketKey);

    if (!userId) {
      return {
        userId: null,
        becameOffline: false,
      };
    }

    const userSocketsKey = this.userSocketsKey(userId);

    await this.redis
      .multi()
      .del(socketKey)
      .sRem(userSocketsKey, socketId)
      .exec();

    const socketsCount = await this.redis.sCard(userSocketsKey);

    if (socketsCount === 0) {
      await this.redis
        .multi()
        .del(userSocketsKey)
        .sRem('presence:online_users', userId)
        .exec();

      return {
        userId,
        becameOffline: true,
      };
    }

    return {
      userId,
      becameOffline: false,
    };
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const socketsCount = await this.redis.sCard(this.userSocketsKey(userId));
    return socketsCount > 0;
  }

  async getOnlineUserIds(): Promise<string[]> {
    return this.redis.sMembers('presence:online_users');
  }

  async getSocketIdsForUser(userId: string): Promise<string[]> {
    return this.redis.sMembers(this.userSocketsKey(userId));
  }
}
