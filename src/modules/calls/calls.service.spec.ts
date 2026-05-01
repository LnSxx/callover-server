/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { CallsService } from './calls.service';

describe('CallsService', () => {
  let service: CallsService;

  beforeEach(() => {
    service = new CallsService();
  });

  describe('initiateCall', () => {
    it('should initiate call', () => {
      const result = service.initiateCall({
        type: 'audio',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        socketId: 'socket-1',
      });

      expect(result.success).toBe(true);

      if (!result.success) {
        throw new Error('Expected success');
      }

      expect(result.call).toEqual({
        type: 'audio',
        userId: 'user-1',
        socketId: 'socket-1',
        peerUserId: 'user-2',
        roomId: expect.any(String),
        status: 'calling',
        createdAt: expect.any(Date),
      });

      expect(service.getCall('user-2')).toEqual({
        type: 'audio',
        userId: 'user-2',
        peerUserId: 'user-1',
        peerSocketId: 'socket-1',
        roomId: result.call.roomId,
        status: 'ringing',
        createdAt: result.call.createdAt,
      });
    });

    it('should fail on self call', () => {
      const result = service.initiateCall({
        type: 'audio',
        fromUserId: 'user-1',
        toUserId: 'user-1',
        socketId: 'socket-1',
      });

      expect(result).toEqual({
        success: false,
        reason: 'self_call',
      });
    });

    it('should fail if caller is busy', () => {
      service.initiateCall({
        type: 'audio',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        socketId: 'socket-1',
      });

      const result = service.initiateCall({
        type: 'audio',
        fromUserId: 'user-1',
        toUserId: 'user-3',
        socketId: 'socket-1',
      });

      expect(result).toEqual({
        success: false,
        reason: 'caller_busy',
      });
    });

    it('should fail if callee is busy', () => {
      service.initiateCall({
        type: 'audio',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        socketId: 'socket-1',
      });

      const result = service.initiateCall({
        type: 'audio',
        fromUserId: 'user-3',
        toUserId: 'user-2',
        socketId: 'socket-3',
      });

      expect(result).toEqual({
        success: false,
        reason: 'callee_busy',
      });
    });
  });

  describe('acceptCall', () => {
    it('should accept ringing call', () => {
      const initResult = service.initiateCall({
        type: 'video',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        socketId: 'socket-1',
      });

      if (!initResult.success) {
        throw new Error('Expected success');
      }

      const acceptedCall = service.acceptCall({
        userId: 'user-2',
        socketId: 'socket-2',
      });

      expect(acceptedCall).toEqual({
        type: 'video',
        userId: 'user-2',
        socketId: 'socket-2',
        peerUserId: 'user-1',
        peerSocketId: 'socket-1',
        roomId: initResult.call.roomId,
        status: 'active',
        createdAt: initResult.call.createdAt,
        acceptedAt: expect.any(Date),
      });

      expect(service.getCall('user-1')).toEqual({
        type: 'video',
        userId: 'user-1',
        socketId: 'socket-1',
        peerUserId: 'user-2',
        peerSocketId: 'socket-2',
        roomId: initResult.call.roomId,
        status: 'active',
        createdAt: initResult.call.createdAt,
        acceptedAt: expect.any(Date),
      });
    });

    it('should return null if user has no call', () => {
      const result = service.acceptCall({
        userId: 'user-1',
        socketId: 'socket-1',
      });

      expect(result).toBeNull();
    });

    it('should return null if caller tries to accept own calling state', () => {
      service.initiateCall({
        type: 'audio',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        socketId: 'socket-1',
      });

      const result = service.acceptCall({
        userId: 'user-1',
        socketId: 'socket-1',
      });

      expect(result).toBeNull();
    });
  });

  describe('endCall', () => {
    it('should end call for both users', () => {
      service.initiateCall({
        type: 'audio',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        socketId: 'socket-1',
      });

      const result = service.endCall('user-1');

      expect(result).toEqual({
        ended: true,
      });

      expect(service.getCall('user-1')).toBeNull();
      expect(service.getCall('user-2')).toBeNull();
    });

    it('should return false if user has no call', () => {
      const result = service.endCall('unknown-user');

      expect(result).toEqual({
        ended: false,
      });
    });
  });

  describe('getCall', () => {
    it('should return null if call does not exist', () => {
      expect(service.getCall('user-1')).toBeNull();
    });
  });
});
