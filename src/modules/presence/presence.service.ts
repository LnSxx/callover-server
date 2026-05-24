import { Inject, Injectable } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { REDIS_CLIENT } from '../redis/redis.provider';

@Injectable()
export class PresenceService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: RedisClientType,
  ) {}

  private readonly socketTtlSeconds = 600;

  private onlineUsersKey(): string {
    return 'presence:online_users';
  }

  private userSocketsKey(userId: string): string {
    return `presence:user:${userId}:sockets`;
  }

  private socketUserKey(socketId: string): string {
    return `presence:socket:${socketId}:user`;
  }

  private nowMs(): number {
    return Date.now();
  }

  private expiresAtMs(): number {
    return this.nowMs() + this.socketTtlSeconds * 1000;
  }

  async markSocketOnline(userId: string, socketId: string): Promise<void> {
    const socketKey = this.socketUserKey(socketId);
    const userSocketsKey = this.userSocketsKey(userId);
    const expiresAt = this.expiresAtMs();

    const hasRegisteredSocket = await this.redis.exists(socketKey);

    if (hasRegisteredSocket) {
      return;
    }

    await this.redis
      .multi()
      .zAdd(userSocketsKey, {
        score: expiresAt,
        value: socketId,
      })
      .set(socketKey, userId, {
        EX: this.socketTtlSeconds,
      })
      .sAdd(this.onlineUsersKey(), userId)
      .exec();
  }

  async refreshSocket(userId: string, socketId: string): Promise<void> {
    const socketKey = this.socketUserKey(socketId);
    const userSocketsKey = this.userSocketsKey(userId);
    const expiresAt = this.expiresAtMs();

    const registeredUserId = await this.redis.get(socketKey);

    if (registeredUserId !== userId) {
      return;
    }

    await this.redis
      .multi()
      .expire(socketKey, this.socketTtlSeconds)
      .zAdd(userSocketsKey, {
        score: expiresAt,
        value: socketId,
      })
      .sAdd(this.onlineUsersKey(), userId)
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
      .zRem(userSocketsKey, socketId)
      .exec();

    const socketsCount = await this.redis.zCard(userSocketsKey);

    if (socketsCount === 0) {
      await this.redis
        .multi()
        .del(userSocketsKey)
        .sRem(this.onlineUsersKey(), userId)
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

  async cleanupExpiredSocketsForUser(userId: string): Promise<void> {
    const userSocketsKey = this.userSocketsKey(userId);
    const expiredSocketIds = await this.redis.zRangeByScore(
      userSocketsKey,
      0,
      this.nowMs(),
    );

    if (expiredSocketIds.length === 0) {
      return;
    }

    const multi = this.redis.multi();

    for (const socketId of expiredSocketIds) {
      multi.del(this.socketUserKey(socketId));
      multi.zRem(userSocketsKey, socketId);
    }

    await multi.exec();

    const socketsCount = await this.redis.zCard(userSocketsKey);

    if (socketsCount === 0) {
      await this.redis
        .multi()
        .del(userSocketsKey)
        .sRem(this.onlineUsersKey(), userId)
        .exec();
    }
  }

  async isUserOnline(userId: string): Promise<boolean> {
    await this.cleanupExpiredSocketsForUser(userId);

    const socketsCount = await this.redis.zCard(this.userSocketsKey(userId));

    return socketsCount > 0;
  }

  async getOnlineUserIds(): Promise<string[]> {
    const userIds = await this.redis.sMembers(this.onlineUsersKey());
    const onlineUserIds: string[] = [];

    for (const userId of userIds) {
      const isOnline = await this.isUserOnline(userId);

      if (isOnline) {
        onlineUserIds.push(userId);
      }
    }

    return onlineUserIds;
  }

  async getSocketIdsForUser(userId: string): Promise<string[]> {
    await this.cleanupExpiredSocketsForUser(userId);

    return this.redis.zRange(this.userSocketsKey(userId), 0, -1);
  }
}
