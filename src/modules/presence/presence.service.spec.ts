/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { FakeRedis } from '../redis/fakeRedis';
import { PresenceService } from './presence.service';

describe('PresenceService', () => {
  let service: PresenceService;

  beforeEach(() => {
    service = new PresenceService(new FakeRedis() as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('markSocketOnline', () => {
    it('should mark user as online', async () => {
      await service.markSocketOnline('user-1', 'socket-1');

      await expect(service.isUserOnline('user-1')).resolves.toBe(true);
      await expect(service.getOnlineUserIds()).resolves.toEqual(['user-1']);
      await expect(service.getSocketIdsForUser('user-1')).resolves.toEqual([
        'socket-1',
      ]);
    });

    it('should add multiple sockets for same user', async () => {
      await service.markSocketOnline('user-1', 'socket-1');
      await service.markSocketOnline('user-1', 'socket-2');

      await expect(service.isUserOnline('user-1')).resolves.toBe(true);
      await expect(service.getOnlineUserIds()).resolves.toEqual(['user-1']);
      await expect(service.getSocketIdsForUser('user-1')).resolves.toEqual([
        'socket-1',
        'socket-2',
      ]);
    });

    it('should ignore already registered socket', async () => {
      await service.markSocketOnline('user-1', 'socket-1');
      await service.markSocketOnline('user-1', 'socket-1');

      await expect(service.getSocketIdsForUser('user-1')).resolves.toEqual([
        'socket-1',
      ]);
    });

    it('should not move already registered socket to another user', async () => {
      await service.markSocketOnline('user-1', 'socket-1');
      await service.markSocketOnline('user-2', 'socket-1');

      await expect(service.getSocketIdsForUser('user-1')).resolves.toEqual([
        'socket-1',
      ]);
      await expect(service.getSocketIdsForUser('user-2')).resolves.toEqual([]);
      await expect(service.isUserOnline('user-1')).resolves.toBe(true);
      await expect(service.isUserOnline('user-2')).resolves.toBe(false);
    });

    it('should mark multiple users as online', async () => {
      await service.markSocketOnline('user-1', 'socket-1');
      await service.markSocketOnline('user-2', 'socket-2');

      await expect(service.isUserOnline('user-1')).resolves.toBe(true);
      await expect(service.isUserOnline('user-2')).resolves.toBe(true);

      const onlineUserIds = await service.getOnlineUserIds();
      expect(onlineUserIds.sort()).toEqual(['user-1', 'user-2']);
    });
  });

  describe('markSocketOffline', () => {
    it('should mark user as offline when last socket disconnects', async () => {
      await service.markSocketOnline('user-1', 'socket-1');

      const result = await service.markSocketOffline('socket-1');

      expect(result).toEqual({
        userId: 'user-1',
        becameOffline: true,
      });

      await expect(service.isUserOnline('user-1')).resolves.toBe(false);
      await expect(service.getOnlineUserIds()).resolves.toEqual([]);
      await expect(service.getSocketIdsForUser('user-1')).resolves.toEqual([]);
    });

    it('should not mark user as offline if another socket is still connected', async () => {
      await service.markSocketOnline('user-1', 'socket-1');
      await service.markSocketOnline('user-1', 'socket-2');

      const result = await service.markSocketOffline('socket-1');

      expect(result).toEqual({
        userId: 'user-1',
        becameOffline: false,
      });

      await expect(service.isUserOnline('user-1')).resolves.toBe(true);
      await expect(service.getSocketIdsForUser('user-1')).resolves.toEqual([
        'socket-2',
      ]);
    });

    it('should return false if socket is unknown', async () => {
      const result = await service.markSocketOffline('unknown-socket');

      expect(result).toEqual({
        userId: null,
        becameOffline: false,
      });
    });

    it('should remove correct user socket without affecting other users', async () => {
      await service.markSocketOnline('user-1', 'socket-1');
      await service.markSocketOnline('user-2', 'socket-2');

      const result = await service.markSocketOffline('socket-1');

      expect(result).toEqual({
        userId: 'user-1',
        becameOffline: true,
      });

      await expect(service.isUserOnline('user-1')).resolves.toBe(false);
      await expect(service.isUserOnline('user-2')).resolves.toBe(true);
      await expect(service.getSocketIdsForUser('user-2')).resolves.toEqual([
        'socket-2',
      ]);
    });
  });

  describe('isUserOnline', () => {
    it('should return false for unknown user', async () => {
      await expect(service.isUserOnline('unknown-user')).resolves.toBe(false);
    });
  });

  describe('getOnlineUserIds', () => {
    it('should return empty array if nobody is online', async () => {
      await expect(service.getOnlineUserIds()).resolves.toEqual([]);
    });
  });

  describe('getSocketIdsForUser', () => {
    it('should return empty array for unknown user', async () => {
      await expect(
        service.getSocketIdsForUser('unknown-user'),
      ).resolves.toEqual([]);
    });

    it('should return a copy of socket ids', async () => {
      await service.markSocketOnline('user-1', 'socket-1');

      const sockets = await service.getSocketIdsForUser('user-1');
      sockets.push('fake-socket');

      await expect(service.getSocketIdsForUser('user-1')).resolves.toEqual([
        'socket-1',
      ]);
    });
  });
});
