/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { FakeRedis } from '../redis/fakeRedis';
import { PresenceSubscriptionsService } from './presenceSubscriptions.service';

describe('PresenceSubscriptionsService', () => {
  let service: PresenceSubscriptionsService;

  beforeEach(() => {
    service = new PresenceSubscriptionsService(new FakeRedis() as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('subscribe', () => {
    it('should subscribe user to watched users', async () => {
      await service.subscribe('subscriber-1', ['user-1', 'user-2']);

      const watchedUsers = await service.getWatchedUsers('subscriber-1');

      expect(watchedUsers.sort()).toEqual(['user-1', 'user-2']);
      await expect(service.getWatchers('user-1')).resolves.toEqual([
        'subscriber-1',
      ]);
      await expect(service.getWatchers('user-2')).resolves.toEqual([
        'subscriber-1',
      ]);
    });

    it('should not duplicate subscriptions', async () => {
      await service.subscribe('subscriber-1', ['user-1']);
      await service.subscribe('subscriber-1', ['user-1']);

      await expect(service.getWatchedUsers('subscriber-1')).resolves.toEqual([
        'user-1',
      ]);
      await expect(service.getWatchers('user-1')).resolves.toEqual([
        'subscriber-1',
      ]);
    });

    it('should allow multiple subscribers for same watched user', async () => {
      await service.subscribe('subscriber-1', ['user-1']);
      await service.subscribe('subscriber-2', ['user-1']);

      const watchers = await service.getWatchers('user-1');

      expect(watchers.sort()).toEqual(['subscriber-1', 'subscriber-2']);
    });

    it('should ignore empty watched users list', async () => {
      await service.subscribe('subscriber-1', []);

      await expect(service.getWatchedUsers('subscriber-1')).resolves.toEqual(
        [],
      );
    });

    it('should ignore self subscription', async () => {
      await service.subscribe('user-1', ['user-1', 'user-2']);

      await expect(service.getWatchedUsers('user-1')).resolves.toEqual([
        'user-2',
      ]);
      await expect(service.getWatchers('user-1')).resolves.toEqual([]);
      await expect(service.getWatchers('user-2')).resolves.toEqual(['user-1']);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe user from all watched users', async () => {
      await service.subscribe('subscriber-1', ['user-1', 'user-2']);

      await service.unsubscribe('subscriber-1');

      await expect(service.getWatchedUsers('subscriber-1')).resolves.toEqual(
        [],
      );
      await expect(service.getWatchers('user-1')).resolves.toEqual([]);
      await expect(service.getWatchers('user-2')).resolves.toEqual([]);
    });

    it('should not affect other subscribers', async () => {
      await service.subscribe('subscriber-1', ['user-1']);
      await service.subscribe('subscriber-2', ['user-1']);

      await service.unsubscribe('subscriber-1');

      await expect(service.getWatchedUsers('subscriber-1')).resolves.toEqual(
        [],
      );
      await expect(service.getWatchedUsers('subscriber-2')).resolves.toEqual([
        'user-1',
      ]);
      await expect(service.getWatchers('user-1')).resolves.toEqual([
        'subscriber-2',
      ]);
    });

    it('should not affect other watched users', async () => {
      await service.subscribe('subscriber-1', ['user-1']);
      await service.subscribe('subscriber-2', ['user-2']);

      await service.unsubscribe('subscriber-1');

      await expect(service.getWatchers('user-1')).resolves.toEqual([]);
      await expect(service.getWatchers('user-2')).resolves.toEqual([
        'subscriber-2',
      ]);
    });

    it('should safely unsubscribe unknown user', async () => {
      await service.unsubscribe('unknown-user');

      await expect(service.getWatchedUsers('unknown-user')).resolves.toEqual(
        [],
      );
    });
  });

  describe('getWatchers', () => {
    it('should return empty array for user without watchers', async () => {
      await expect(service.getWatchers('user-1')).resolves.toEqual([]);
    });
  });

  describe('getWatchedUsers', () => {
    it('should return empty array for user without watched users', async () => {
      await expect(service.getWatchedUsers('user-1')).resolves.toEqual([]);
    });

    it('should return a copy of watched users', async () => {
      await service.subscribe('subscriber-1', ['user-1']);

      const watchedUsers = await service.getWatchedUsers('subscriber-1');
      watchedUsers.push('fake-user');

      await expect(service.getWatchedUsers('subscriber-1')).resolves.toEqual([
        'user-1',
      ]);
    });
  });
});
