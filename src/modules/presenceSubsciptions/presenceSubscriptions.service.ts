import { Injectable } from '@nestjs/common';

/**
 * Service holds in memory information about user's subscription about other users presence
 */
@Injectable()
export class PresenceSubscriptionsService {
  // Watched userId -> set of subscribers userIds
  private watchersByUser: Map<string, Set<string>> = new Map();
  // Subscriber userId -> set of watched userIds
  private watchedByUser: Map<string, Set<string>> = new Map();

  subscribe(subscriberId: string, watchedIds: string[]): void {
    for (const watchedId of watchedIds) {
      // Check if watched user is already being watched by the subscriber
      if (this.watchedByUser.get(subscriberId)?.has(watchedId)) {
        continue; // Already subscribed, no action needed
      }

      // Check if watched user is not being watched by any subscriber
      if (!this.watchersByUser.has(watchedId)) {
        // If not, initialize the set of subscribers for the watched user
        this.watchersByUser.set(watchedId, new Set());
      }
      // Add the subscriber to the set of subscribers for the watched user
      this.watchersByUser.get(watchedId)?.add(subscriberId);

      // Check if subscriber is not watching any users yet
      if (!this.watchedByUser.has(subscriberId)) {
        // If not, initialize the set of watched users for the subscriber
        this.watchedByUser.set(subscriberId, new Set());
      }
      // Add the watched user to the set of watched users for the subscriber
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

  getWatchers(userId: string): Set<string> {
    return this.watchersByUser.get(userId) || new Set();
  }

  getWatchedUsers(userId: string): Set<string> {
    return this.watchedByUser.get(userId) || new Set();
  }
}
