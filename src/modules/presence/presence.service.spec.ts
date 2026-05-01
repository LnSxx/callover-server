import { PresenceService } from './presence.service';

describe('PresenceService', () => {
  let service: PresenceService;

  beforeEach(() => {
    service = new PresenceService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('markSocketOnline', () => {
    it('should mark user as online', () => {
      service.markSocketOnline('user-1', 'socket-1');

      expect(service.isUserOnline('user-1')).toBe(true);
      expect(service.getOnlineUserIds()).toEqual(['user-1']);
      expect(service.getSocketIdsForUser('user-1')).toEqual(['socket-1']);
    });

    it('should add multiple sockets for same user', () => {
      service.markSocketOnline('user-1', 'socket-1');
      service.markSocketOnline('user-1', 'socket-2');

      expect(service.isUserOnline('user-1')).toBe(true);
      expect(service.getOnlineUserIds()).toEqual(['user-1']);
      expect(service.getSocketIdsForUser('user-1')).toEqual([
        'socket-1',
        'socket-2',
      ]);
    });

    it('should ignore already registered socket', () => {
      service.markSocketOnline('user-1', 'socket-1');
      service.markSocketOnline('user-1', 'socket-1');

      expect(service.getSocketIdsForUser('user-1')).toEqual(['socket-1']);
    });

    it('should not move already registered socket to another user', () => {
      service.markSocketOnline('user-1', 'socket-1');
      service.markSocketOnline('user-2', 'socket-1');

      expect(service.getSocketIdsForUser('user-1')).toEqual(['socket-1']);
      expect(service.getSocketIdsForUser('user-2')).toEqual([]);
      expect(service.isUserOnline('user-1')).toBe(true);
      expect(service.isUserOnline('user-2')).toBe(false);
    });

    it('should mark multiple users as online', () => {
      service.markSocketOnline('user-1', 'socket-1');
      service.markSocketOnline('user-2', 'socket-2');

      expect(service.isUserOnline('user-1')).toBe(true);
      expect(service.isUserOnline('user-2')).toBe(true);
      expect(service.getOnlineUserIds()).toEqual(['user-1', 'user-2']);
    });
  });

  describe('markSocketOffline', () => {
    it('should mark user as offline when last socket disconnects', () => {
      service.markSocketOnline('user-1', 'socket-1');

      const result = service.markSocketOffline({
        socketId: 'socket-1',
      });

      expect(result).toEqual({
        userId: 'user-1',
        becameOffline: true,
      });

      expect(service.isUserOnline('user-1')).toBe(false);
      expect(service.getOnlineUserIds()).toEqual([]);
      expect(service.getSocketIdsForUser('user-1')).toEqual([]);
    });

    it('should not mark user as offline if another socket is still connected', () => {
      service.markSocketOnline('user-1', 'socket-1');
      service.markSocketOnline('user-1', 'socket-2');

      const result = service.markSocketOffline({
        socketId: 'socket-1',
      });

      expect(result).toEqual({
        userId: 'user-1',
        becameOffline: false,
      });

      expect(service.isUserOnline('user-1')).toBe(true);
      expect(service.getSocketIdsForUser('user-1')).toEqual(['socket-2']);
    });

    it('should return false if socket is unknown', () => {
      const result = service.markSocketOffline({
        socketId: 'unknown-socket',
      });

      expect(result).toEqual({
        userId: null,
        becameOffline: false,
      });
    });

    it('should remove correct user socket without affecting other users', () => {
      service.markSocketOnline('user-1', 'socket-1');
      service.markSocketOnline('user-2', 'socket-2');

      const result = service.markSocketOffline({
        socketId: 'socket-1',
      });

      expect(result).toEqual({
        userId: 'user-1',
        becameOffline: true,
      });

      expect(service.isUserOnline('user-1')).toBe(false);
      expect(service.isUserOnline('user-2')).toBe(true);
      expect(service.getSocketIdsForUser('user-2')).toEqual(['socket-2']);
    });
  });

  describe('isUserOnline', () => {
    it('should return false for unknown user', () => {
      expect(service.isUserOnline('unknown-user')).toBe(false);
    });
  });

  describe('getOnlineUserIds', () => {
    it('should return empty array if nobody is online', () => {
      expect(service.getOnlineUserIds()).toEqual([]);
    });
  });

  describe('getSocketIdsForUser', () => {
    it('should return empty array for unknown user', () => {
      expect(service.getSocketIdsForUser('unknown-user')).toEqual([]);
    });

    it('should return a copy of socket ids', () => {
      service.markSocketOnline('user-1', 'socket-1');

      const sockets = service.getSocketIdsForUser('user-1');
      sockets.push('fake-socket');

      expect(service.getSocketIdsForUser('user-1')).toEqual(['socket-1']);
    });
  });
});
