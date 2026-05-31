/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { FakeRedis } from '../redis/fake-redis';
import { CallsService } from './calls.service';

const callerUserId = 'user-1';
const calleeUserId = 'user-2';
const callerSocketId = 'socket-1';
const calleeSocketId = 'socket-2';

describe('CallsService', () => {
  let service: CallsService;

  beforeEach(() => {
    service = new CallsService(new FakeRedis() as any);
  });

  async function initiateCallOrThrow(type: 'audio' | 'video' = 'audio') {
    const result = await service.initiateCall({
      type,
      fromUserId: callerUserId,
      toUserId: calleeUserId,
      socketId: callerSocketId,
    });

    if (!result.success) {
      throw new Error(`Expected initiateCall success, got ${result.reason}`);
    }

    return result.call;
  }

  async function acceptCallOrThrow() {
    const result = await service.acceptCall({
      calleeUserId,
      calleeSocketId,
    });

    if (!result.accepted) {
      throw new Error(`Expected acceptCall success, got ${result.reason}`);
    }

    return result.call;
  }

  describe('initiateCall', () => {
    it('should initiate call for caller and callee', async () => {
      const result = await service.initiateCall({
        type: 'audio',
        fromUserId: callerUserId,
        toUserId: calleeUserId,
        socketId: callerSocketId,
      });

      expect(result.success).toBe(true);

      if (!result.success) {
        throw new Error('Expected success');
      }

      expect(result.call).toEqual({
        type: 'audio',
        direction: 'outgoing',
        userId: callerUserId,
        socketId: callerSocketId,
        peerUserId: calleeUserId,
        roomId: expect.any(String),
        status: 'calling',
        createdAt: expect.any(Date),
      });

      await expect(service.getCall(callerUserId)).resolves.toEqual(result.call);

      await expect(service.getCall(calleeUserId)).resolves.toEqual({
        type: 'audio',
        direction: 'incoming',
        userId: calleeUserId,
        peerUserId: callerUserId,
        peerSocketId: callerSocketId,
        roomId: result.call.roomId,
        status: 'ringing',
        createdAt: result.call.createdAt,
      });
    });

    it('should fail on self call', async () => {
      const result = await service.initiateCall({
        type: 'audio',
        fromUserId: callerUserId,
        toUserId: callerUserId,
        socketId: callerSocketId,
      });

      expect(result).toEqual({
        success: false,
        reason: 'self-call',
      });
    });

    it('should fail if caller is busy', async () => {
      await initiateCallOrThrow();

      const result = await service.initiateCall({
        type: 'audio',
        fromUserId: callerUserId,
        toUserId: 'user-3',
        socketId: callerSocketId,
      });

      expect(result).toEqual({
        success: false,
        reason: 'caller-busy',
      });
    });

    it('should fail if callee is busy', async () => {
      await initiateCallOrThrow();

      const result = await service.initiateCall({
        type: 'audio',
        fromUserId: 'user-3',
        toUserId: calleeUserId,
        socketId: 'socket-3',
      });

      expect(result).toEqual({
        success: false,
        reason: 'callee-busy',
      });
    });
  });

  describe('acceptCall', () => {
    it('should accept ringing call', async () => {
      const callerCall = await initiateCallOrThrow('video');

      const result = await service.acceptCall({
        calleeUserId,
        calleeSocketId,
      });

      expect(result).toEqual({
        accepted: true,
        call: {
          type: 'video',
          direction: 'incoming',
          userId: calleeUserId,
          socketId: calleeSocketId,
          peerUserId: callerUserId,
          peerSocketId: callerSocketId,
          roomId: callerCall.roomId,
          status: 'active',
          createdAt: callerCall.createdAt,
          acceptedAt: expect.any(Date),
        },
      });

      if (!result.accepted) {
        throw new Error('Expected accepted call');
      }

      await expect(service.getCall(callerUserId)).resolves.toEqual({
        type: 'video',
        direction: 'outgoing',
        userId: callerUserId,
        socketId: callerSocketId,
        peerUserId: calleeUserId,
        peerSocketId: calleeSocketId,
        roomId: callerCall.roomId,
        status: 'active',
        createdAt: callerCall.createdAt,
        acceptedAt: result.call.acceptedAt,
      });
    });

    it('should fail if user has no call', async () => {
      const result = await service.acceptCall({
        calleeUserId,
        calleeSocketId,
      });

      expect(result).toEqual({
        accepted: false,
        reason: 'not-found',
      });
    });

    it('should fail if caller tries to accept own calling state', async () => {
      await initiateCallOrThrow();

      const result = await service.acceptCall({
        calleeUserId: callerUserId,
        calleeSocketId: callerSocketId,
      });

      expect(result).toEqual({
        accepted: false,
        reason: 'invalid-state',
      });
    });
  });

  describe('declineCall', () => {
    it('should decline ringing call and delete both call records', async () => {
      const callerCall = await initiateCallOrThrow();
      const calleeCall = await service.getCall(calleeUserId);

      const result = await service.declineCall(calleeUserId);

      expect(result).toEqual({
        declined: true,
        declinedCallerCall: callerCall,
        declinedCalleeCall: calleeCall,
      });

      await expect(service.getCall(callerUserId)).resolves.toBeNull();
      await expect(service.getCall(calleeUserId)).resolves.toBeNull();
    });

    it('should fail if callee has no call', async () => {
      await expect(service.declineCall(calleeUserId)).resolves.toEqual({
        declined: false,
        reason: 'not-found',
      });
    });

    it('should fail if call is already active', async () => {
      await initiateCallOrThrow();
      await acceptCallOrThrow();

      await expect(service.declineCall(calleeUserId)).resolves.toEqual({
        declined: false,
        reason: 'invalid-status',
      });
    });
  });

  describe('cancelCall', () => {
    it('should cancel ringing call and delete both call records', async () => {
      const callerCall = await initiateCallOrThrow();
      const calleeCall = await service.getCall(calleeUserId);

      const result = await service.cancelCall(callerUserId);

      expect(result).toEqual({
        cancelled: true,
        cancelledCallerCall: callerCall,
        cancelledCalleeCall: calleeCall,
      });

      await expect(service.getCall(callerUserId)).resolves.toBeNull();
      await expect(service.getCall(calleeUserId)).resolves.toBeNull();
    });

    it('should fail if caller has no call', async () => {
      await expect(service.cancelCall(callerUserId)).resolves.toEqual({
        cancelled: false,
        reason: 'not-found',
      });
    });

    it('should fail if call is already active', async () => {
      await initiateCallOrThrow();
      await acceptCallOrThrow();

      await expect(service.cancelCall(callerUserId)).resolves.toEqual({
        cancelled: false,
        reason: 'invalid-status',
      });
    });
  });

  describe('endCall', () => {
    it('should end active call for both users when caller ends', async () => {
      await initiateCallOrThrow();
      const calleeCall = await acceptCallOrThrow();
      const callerCall = await service.getCall(callerUserId);

      const result = await service.endCall(callerUserId);

      expect(result).toEqual({
        ended: true,
        endedCallerCall: callerCall,
        endedCalleeCall: calleeCall,
      });

      await expect(service.getCall(callerUserId)).resolves.toBeNull();
      await expect(service.getCall(calleeUserId)).resolves.toBeNull();
    });

    it('should end active call for both users when callee ends', async () => {
      await initiateCallOrThrow();
      const calleeCall = await acceptCallOrThrow();
      const callerCall = await service.getCall(callerUserId);

      const result = await service.endCall(calleeUserId);

      expect(result).toEqual({
        ended: true,
        endedCallerCall: callerCall,
        endedCalleeCall: calleeCall,
      });

      await expect(service.getCall(callerUserId)).resolves.toBeNull();
      await expect(service.getCall(calleeUserId)).resolves.toBeNull();
    });

    it('should fail if user has no call', async () => {
      const result = await service.endCall('unknown-user');

      expect(result).toEqual({
        ended: false,
        reason: 'not-found',
      });
    });

    it('should fail if call is not active yet', async () => {
      await initiateCallOrThrow();

      await expect(service.endCall(callerUserId)).resolves.toEqual({
        ended: false,
        reason: 'invalid-status',
      });
    });
  });

  describe('timeoutRingingCall', () => {
    it('should timeout ringing call and delete both call records', async () => {
      const callerCall = await initiateCallOrThrow();
      const calleeCall = await service.getCall(calleeUserId);

      const result = await service.timeoutRingingCall({
        calleeUserId,
        roomId: callerCall.roomId,
      });

      expect(result).toEqual({
        timedOut: true,
        timedOutCallerCall: callerCall,
        timedOutCalleeCall: calleeCall,
      });

      await expect(service.getCall(callerUserId)).resolves.toBeNull();
      await expect(service.getCall(calleeUserId)).resolves.toBeNull();
    });

    it('should fail if callee has no call', async () => {
      await expect(
        service.timeoutRingingCall({
          calleeUserId,
          roomId: 'room-1',
        }),
      ).resolves.toEqual({
        timedOut: false,
        reason: 'not-found',
      });
    });

    it('should fail if room id does not match', async () => {
      await initiateCallOrThrow();

      await expect(
        service.timeoutRingingCall({
          calleeUserId,
          roomId: 'wrong-room-id',
        }),
      ).resolves.toEqual({
        timedOut: false,
        reason: 'unexpected-peer',
      });
    });

    it('should fail if call is already active', async () => {
      const callerCall = await initiateCallOrThrow();
      await acceptCallOrThrow();

      await expect(
        service.timeoutRingingCall({
          calleeUserId,
          roomId: callerCall.roomId,
        }),
      ).resolves.toEqual({
        timedOut: false,
        reason: 'invalid-status',
      });
    });
  });

  describe('endCallByRoom', () => {
    it('should end active call by room', async () => {
      const callerCall = await initiateCallOrThrow();
      await acceptCallOrThrow();

      const result = await service.endCallByRoom({
        userId: callerUserId,
        roomId: callerCall.roomId,
      });

      expect(result.ended).toBe(true);

      await expect(service.getCall(callerUserId)).resolves.toBeNull();
      await expect(service.getCall(calleeUserId)).resolves.toBeNull();
    });

    it('should fail if user has no call', async () => {
      await expect(
        service.endCallByRoom({
          userId: callerUserId,
          roomId: 'room-1',
        }),
      ).resolves.toEqual({
        ended: false,
        reason: 'not-found',
      });
    });

    it('should fail if room id does not match', async () => {
      await initiateCallOrThrow();

      await expect(
        service.endCallByRoom({
          userId: callerUserId,
          roomId: 'wrong-room-id',
        }),
      ).resolves.toEqual({
        ended: false,
        reason: 'unexpected-peer',
      });
    });
  });

  describe('getCall', () => {
    it('should return null if call does not exist', async () => {
      await expect(service.getCall(callerUserId)).resolves.toBeNull();
    });
  });

  describe('getCurrentRingingCall', () => {
    it('should return current ringing call only for callee', async () => {
      const callerCall = await initiateCallOrThrow();

      await expect(
        service.getCurrentRingingCall(calleeUserId),
      ).resolves.toEqual({
        type: 'audio',
        direction: 'incoming',
        userId: calleeUserId,
        peerUserId: callerUserId,
        peerSocketId: callerSocketId,
        roomId: callerCall.roomId,
        status: 'ringing',
        createdAt: callerCall.createdAt,
      });

      await expect(
        service.getCurrentRingingCall(callerUserId),
      ).resolves.toBeNull();
    });

    it('should return null after call is accepted', async () => {
      await initiateCallOrThrow();
      await acceptCallOrThrow();

      await expect(
        service.getCurrentRingingCall(calleeUserId),
      ).resolves.toBeNull();
    });
  });
});
