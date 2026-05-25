import { Inject, Injectable } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { REDIS_CLIENT } from '../redis/redis.provider';

@Injectable()
export class PresenceSubscriptionsService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: RedisClientType,
  ) {}

  private readonly subscriptionTtlSeconds = 900;

  private watchersKey(watchedUserId: string): string {
    return `presence_subscriptions:watchers:${watchedUserId}`;
  }

  private watchedKey(subscriberId: string): string {
    return `presence_subscriptions:watched:${subscriberId}`;
  }

  private nowMs(): number {
    return Date.now();
  }

  private expiresAtMs(): number {
    return this.nowMs() + this.subscriptionTtlSeconds * 1000;
  }

  async subscribe(subscriberId: string, watchedIds: string[]): Promise<void> {
    const uniqueWatchedIds = [...new Set(watchedIds)].filter(
      (watchedId) => watchedId !== subscriberId,
    );

    if (uniqueWatchedIds.length === 0) {
      return;
    }

    const expiresAt = this.expiresAtMs();
    const multi = this.redis.multi();

    for (const watchedId of uniqueWatchedIds) {
      multi.zAdd(this.watchersKey(watchedId), {
        score: expiresAt,
        value: subscriberId,
      });

      multi.zAdd(this.watchedKey(subscriberId), {
        score: expiresAt,
        value: watchedId,
      });
    }

    await multi.exec();
  }

  async refreshSubscriptions(subscriberId: string): Promise<void> {
    await this.cleanupExpiredSubscriptionsForSubscriber(subscriberId);

    const watchedIds = await this.getWatchedUsers(subscriberId);

    if (watchedIds.length === 0) {
      return;
    }

    const expiresAt = this.expiresAtMs();
    const multi = this.redis.multi();

    for (const watchedId of watchedIds) {
      multi.zAdd(this.watchersKey(watchedId), {
        score: expiresAt,
        value: subscriberId,
      });

      multi.zAdd(this.watchedKey(subscriberId), {
        score: expiresAt,
        value: watchedId,
      });
    }

    await multi.exec();
  }

  async unsubscribe(subscriberId: string): Promise<void> {
    const watchedIds = await this.getWatchedUsers(subscriberId);

    if (watchedIds.length === 0) {
      await this.redis.del(this.watchedKey(subscriberId));
      return;
    }

    const multi = this.redis.multi();

    for (const watchedId of watchedIds) {
      multi.zRem(this.watchersKey(watchedId), subscriberId);
    }

    multi.del(this.watchedKey(subscriberId));

    await multi.exec();
  }

  async cleanupExpiredSubscriptionsForWatchedUser(
    watchedUserId: string,
  ): Promise<void> {
    const watchersKey = this.watchersKey(watchedUserId);
    const expiredSubscriberIds = await this.redis.zRangeByScore(
      watchersKey,
      0,
      this.nowMs(),
    );

    if (expiredSubscriberIds.length === 0) {
      return;
    }

    const multi = this.redis.multi();

    for (const subscriberId of expiredSubscriberIds) {
      multi.zRem(watchersKey, subscriberId);
      multi.zRem(this.watchedKey(subscriberId), watchedUserId);
    }

    await multi.exec();
  }

  async cleanupExpiredSubscriptionsForSubscriber(
    subscriberId: string,
  ): Promise<void> {
    const watchedKey = this.watchedKey(subscriberId);
    const expiredWatchedIds = await this.redis.zRangeByScore(
      watchedKey,
      0,
      this.nowMs(),
    );

    if (expiredWatchedIds.length === 0) {
      return;
    }

    const multi = this.redis.multi();

    for (const watchedId of expiredWatchedIds) {
      multi.zRem(watchedKey, watchedId);
      multi.zRem(this.watchersKey(watchedId), subscriberId);
    }

    await multi.exec();
  }

  async getWatchers(userId: string): Promise<string[]> {
    await this.cleanupExpiredSubscriptionsForWatchedUser(userId);

    return this.redis.zRange(this.watchersKey(userId), 0, -1);
  }

  async getWatchedUsers(userId: string): Promise<string[]> {
    await this.cleanupExpiredSubscriptionsForSubscriber(userId);

    return this.redis.zRange(this.watchedKey(userId), 0, -1);
  }
}
