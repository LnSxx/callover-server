import { Injectable } from '@nestjs/common';

@Injectable()
export class PresenceSubscriptionsService {
  // Watched userId -> set of subscribers userIds
  private watchersByUser: Map<string, Set<string>> = new Map();
  // Subscriber userId -> set of watched userIds
  private watchedByUser: Map<string, Set<string>> = new Map();

  subscribe(subscriberId: string, watchedIds: string[]): void {
    for (const watchedId of watchedIds) {
      if (this.watchedByUser.get(subscriberId)?.has(watchedId)) {
        continue;
      }

      if (!this.watchersByUser.has(watchedId)) {
        this.watchersByUser.set(watchedId, new Set());
      }
      this.watchersByUser.get(watchedId)?.add(subscriberId);

      if (!this.watchedByUser.has(subscriberId)) {
        this.watchedByUser.set(subscriberId, new Set());
      }
      this.watchedByUser.get(subscriberId)?.add(watchedId);
    }
  }

  unsubscribe(subscriberId: string): void {
    const watchedIds = this.watchedByUser.get(subscriberId);

    if (watchedIds) {
      for (const watchedId of watchedIds) {
        const watchers = this.watchersByUser.get(watchedId);
        if (watchers) {
          watchers.delete(subscriberId);
          if (watchers.size === 0) {
            this.watchersByUser.delete(watchedId);
          }
        }
      }
    }
    this.watchedByUser.delete(subscriberId);
  }

  getWatchers(userId: string): string[] {
    return [...(this.watchersByUser.get(userId) ?? [])];
  }

  getWatchedUsers(userId: string): string[] {
    return [...(this.watchedByUser.get(userId) ?? [])];
  }
}
