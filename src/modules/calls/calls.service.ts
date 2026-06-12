import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { REDIS_CLIENT } from '../redis/redis.provider';
import type {
  CallAcceptParams,
  CallAcceptResult,
  CallCancelResult,
  CallDeclineResult,
  CallEndResult,
  CallInitParams,
  CallInitResult,
  CallRingingTimeoutResult,
} from './calls.types';
import { Call } from '../../entities/call';
import { PendingIceCandidate } from '../../entities/pending-ice-candidate';
import { IceCandidate } from '../../entities/ice-candidate';

@Injectable()
export class CallsService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: RedisClientType,
  ) {}

  private readonly ringingTtlSeconds = 120; // 2 minutes
  private readonly activeTtlSeconds = 21_600 + 300; // 6 hours + 5 minutes

  private userCallKey(userId: string): string {
    return `calls:user:${userId}`;
  }

  private roomUsersKey(roomId: string): string {
    return `calls:room:${roomId}:users`;
  }

  private pendingIceCandidatesKey(
    roomId: string,
    targetUserId: string,
  ): string {
    return `calls:room:${roomId}:pending-ice:${targetUserId}`;
  }

  async initiateCall(params: CallInitParams): Promise<CallInitResult> {
    const { type, fromUserId, toUserId, socketId, remoteDescription } = params;

    if (fromUserId === toUserId) {
      return {
        success: false,
        reason: 'self-call',
      };
    }

    const callerBusy = await this.redis.exists(this.userCallKey(fromUserId));

    if (callerBusy) {
      return {
        success: false,
        reason: 'caller-busy',
      };
    }

    const calleeBusy = await this.redis.exists(this.userCallKey(toUserId));

    if (calleeBusy) {
      return {
        success: false,
        reason: 'callee-busy',
      };
    }

    const callId = randomUUID();
    const createdAt = new Date();

    const callerCall: Call = {
      type,
      direction: 'outgoing',
      userId: fromUserId,
      socketId,
      peerUserId: toUserId,
      roomId: callId,
      status: 'calling',
      createdAt,
    };

    const calleeCall: Call = {
      type,
      direction: 'incoming',
      userId: toUserId,
      peerUserId: fromUserId,
      peerSocketId: socketId,
      roomId: callId,
      status: 'ringing',
      createdAt,
      remoteDescription,
    };

    await this.redis
      .multi()
      .set(this.userCallKey(fromUserId), JSON.stringify(callerCall), {
        EX: this.ringingTtlSeconds,
      })
      .set(this.userCallKey(toUserId), JSON.stringify(calleeCall), {
        EX: this.ringingTtlSeconds,
      })
      .sAdd(this.roomUsersKey(callId), fromUserId)
      .sAdd(this.roomUsersKey(callId), toUserId)
      .expire(this.roomUsersKey(callId), this.ringingTtlSeconds)
      .exec();

    return {
      success: true,
      call: callerCall,
    };
  }

  async acceptCall(params: CallAcceptParams): Promise<CallAcceptResult> {
    const { calleeUserId, calleeSocketId, remoteDescription } = params;

    const calleeCall = await this.getCall(calleeUserId);

    if (!calleeCall) {
      return {
        accepted: false,
        reason: 'not-found',
      };
    }

    if (calleeCall.status !== 'ringing') {
      return {
        accepted: false,
        reason: 'invalid-state',
      };
    }

    const callerCall = await this.getCall(calleeCall.peerUserId);

    if (!callerCall) {
      return {
        accepted: false,
        reason: 'not-found',
      };
    }

    if (calleeCall.roomId !== callerCall.roomId) {
      return {
        accepted: false,
        reason: 'unexpected-peer',
      };
    }

    if (callerCall.status !== 'calling') {
      return {
        accepted: false,
        reason: 'invalid-state',
      };
    }

    if (
      calleeCall.direction !== 'incoming' ||
      callerCall.direction !== 'outgoing'
    ) {
      return {
        accepted: false,
        reason: 'unexpected-peer',
      };
    }

    const acceptedAt = new Date();

    const updatedCalleeCall: Call = {
      ...calleeCall,
      socketId: calleeSocketId,
      peerSocketId: callerCall.socketId,
      status: 'active',
      acceptedAt,
    };

    const updatedCallerCall: Call = {
      ...callerCall,
      peerSocketId: calleeSocketId,
      status: 'active',
      acceptedAt,
      remoteDescription,
    };

    await this.redis
      .multi()
      .set(this.userCallKey(calleeUserId), JSON.stringify(updatedCalleeCall), {
        EX: this.activeTtlSeconds,
      })
      .set(
        this.userCallKey(callerCall.userId),
        JSON.stringify(updatedCallerCall),
        {
          EX: this.activeTtlSeconds,
        },
      )
      .expire(this.roomUsersKey(calleeCall.roomId), this.activeTtlSeconds)
      .exec();

    return {
      accepted: true,
      call: updatedCalleeCall,
    };
  }

  async declineCall(calleeUserId: string): Promise<CallDeclineResult> {
    const calleeCall = await this.getCall(calleeUserId);

    if (!calleeCall) {
      return {
        declined: false,
        reason: 'not-found',
      };
    }

    const callerCall = await this.getCall(calleeCall.peerUserId);

    if (!callerCall) {
      return {
        declined: false,
        reason: 'not-found',
      };
    }

    if (calleeCall.roomId !== callerCall.roomId) {
      return {
        declined: false,
        reason: 'unexpected-peer',
      };
    }

    if (
      calleeCall.direction !== 'incoming' ||
      callerCall.direction !== 'outgoing'
    ) {
      return {
        declined: false,
        reason: 'unexpected-peer',
      };
    }

    if (calleeCall.status !== 'ringing' || callerCall.status !== 'calling') {
      return {
        declined: false,
        reason: 'invalid-status',
      };
    }

    await this.deleteCallRoom({
      roomId: calleeCall.roomId,
      userIds: [callerCall.userId, calleeCall.userId],
    });

    return {
      declined: true,
      declinedCalleeCall: calleeCall,
      declinedCallerCall: callerCall,
    };
  }

  async cancelCall(callerUserId: string): Promise<CallCancelResult> {
    const callerCall = await this.getCall(callerUserId);

    if (!callerCall) {
      return {
        cancelled: false,
        reason: 'not-found',
      };
    }

    const calleeCall = await this.getCall(callerCall.peerUserId);

    if (!calleeCall) {
      return {
        cancelled: false,
        reason: 'not-found',
      };
    }

    if (calleeCall.roomId !== callerCall.roomId) {
      return {
        cancelled: false,
        reason: 'unexpected-peer',
      };
    }

    if (
      callerCall.direction !== 'outgoing' ||
      calleeCall.direction !== 'incoming'
    ) {
      return {
        cancelled: false,
        reason: 'unexpected-peer',
      };
    }

    if (callerCall.status !== 'calling' || calleeCall.status !== 'ringing') {
      return {
        cancelled: false,
        reason: 'invalid-status',
      };
    }

    await this.deleteCallRoom({
      roomId: callerCall.roomId,
      userIds: [callerCall.userId, calleeCall.userId],
    });

    return {
      cancelled: true,
      cancelledCalleeCall: calleeCall,
      cancelledCallerCall: callerCall,
    };
  }

  async endCall(userId: string): Promise<CallEndResult> {
    const call = await this.getCall(userId);

    if (!call) {
      return {
        ended: false,
        reason: 'not-found',
      };
    }

    const peerCall = await this.getCall(call.peerUserId);

    if (!peerCall) {
      return {
        ended: false,
        reason: 'not-found',
      };
    }

    if (call.roomId !== peerCall.roomId) {
      return {
        ended: false,
        reason: 'unexpected-peer',
      };
    }

    const hasValidDirections =
      (call.direction === 'outgoing' && peerCall.direction === 'incoming') ||
      (call.direction === 'incoming' && peerCall.direction === 'outgoing');

    if (!hasValidDirections) {
      return {
        ended: false,
        reason: 'unexpected-peer',
      };
    }

    if (call.status !== 'active' || peerCall.status !== 'active') {
      return {
        ended: false,
        reason: 'invalid-status',
      };
    }

    if (!call.acceptedAt || !peerCall.acceptedAt) {
      return {
        ended: false,
        reason: 'invalid-status',
      };
    }

    await this.deleteCallRoom({
      roomId: call.roomId,
      userIds: [call.userId, peerCall.userId],
    });

    return {
      ended: true,
      endedCallerCall: call.direction === 'outgoing' ? call : peerCall,
      endedCalleeCall: call.direction === 'incoming' ? call : peerCall,
    };
  }

  async timeoutRingingCall(params: {
    calleeUserId: string;
    roomId: string;
  }): Promise<CallRingingTimeoutResult> {
    const calleeCall = await this.getCall(params.calleeUserId);

    if (!calleeCall) {
      return {
        timedOut: false,
        reason: 'not-found',
      };
    }

    if (calleeCall.roomId !== params.roomId) {
      return {
        timedOut: false,
        reason: 'unexpected-peer',
      };
    }

    const callerCall = await this.getCall(calleeCall.peerUserId);

    if (!callerCall) {
      return {
        timedOut: false,
        reason: 'not-found',
      };
    }

    if (callerCall.roomId !== calleeCall.roomId) {
      return {
        timedOut: false,
        reason: 'unexpected-peer',
      };
    }

    if (
      calleeCall.direction !== 'incoming' ||
      callerCall.direction !== 'outgoing'
    ) {
      return {
        timedOut: false,
        reason: 'unexpected-peer',
      };
    }

    if (calleeCall.status !== 'ringing' || callerCall.status !== 'calling') {
      return {
        timedOut: false,
        reason: 'invalid-status',
      };
    }

    await this.deleteCallRoom({
      roomId: calleeCall.roomId,
      userIds: [calleeCall.userId, callerCall.userId],
    });

    return {
      timedOut: true,
      timedOutCallerCall: callerCall,
      timedOutCalleeCall: calleeCall,
    };
  }

  async endCallByRoom(params: {
    userId: string;
    roomId: string;
  }): Promise<CallEndResult> {
    const call = await this.getCall(params.userId);

    if (!call) {
      return {
        ended: false,
        reason: 'not-found',
      };
    }

    if (call.roomId !== params.roomId) {
      return {
        ended: false,
        reason: 'unexpected-peer',
      };
    }

    return this.endCall(params.userId);
  }

  async getCall(userId: string): Promise<Call | null> {
    const rawCall = await this.redis.get(this.userCallKey(userId));

    if (!rawCall) {
      return null;
    }

    try {
      const parsedCall = JSON.parse(rawCall) as Omit<
        Call,
        'createdAt' | 'acceptedAt'
      > & {
        createdAt: string;
        acceptedAt?: string;
      };

      return {
        ...parsedCall,
        createdAt: new Date(parsedCall.createdAt),
        acceptedAt: parsedCall.acceptedAt
          ? new Date(parsedCall.acceptedAt)
          : undefined,
      };
    } catch {
      await this.redis.del(this.userCallKey(userId));
      return null;
    }
  }

  async getCurrentRingingCall(userId: string): Promise<{
    call: Call | null;
    pendingIceCandidates: PendingIceCandidate[];
  }> {
    const call = await this.getCall(userId);

    if (!call || call.status !== 'ringing') {
      return {
        call: null,
        pendingIceCandidates: [],
      };
    }

    const pendingIceCandidates = await this.getPendingIceCandidates({
      roomId: call.roomId,
      targetUserId: userId,
    });

    return {
      call,
      pendingIceCandidates: pendingIceCandidates,
    };
  }

  async addPendingIceCandidate(params: {
    roomId: string;
    targetUserId: string;
    candidate: IceCandidate;
  }): Promise<void> {
    const key = this.pendingIceCandidatesKey(
      params.roomId,
      params.targetUserId,
    );

    const pendingCandidate: PendingIceCandidate = {
      ...params.candidate,
      createdAt: new Date(),
    };

    await this.redis
      .multi()
      .rPush(key, JSON.stringify(pendingCandidate))
      .lTrim(key, -100, -1)
      .expire(key, this.ringingTtlSeconds)
      .exec();
  }

  async getPendingIceCandidates(params: {
    roomId: string;
    targetUserId: string;
  }): Promise<PendingIceCandidate[]> {
    const rawCandidates = await this.redis.lRange(
      this.pendingIceCandidatesKey(params.roomId, params.targetUserId),
      0,
      -1,
    );

    const candidates: PendingIceCandidate[] = [];

    for (const rawCandidate of rawCandidates) {
      try {
        const parsedCandidate = JSON.parse(rawCandidate) as Omit<
          PendingIceCandidate,
          'createdAt'
        > & {
          createdAt: string;
        };

        candidates.push({
          ...parsedCandidate,
          createdAt: new Date(parsedCandidate.createdAt),
        });
      } catch {
        continue;
      }
    }

    return candidates;
  }

  private async deleteCallRoom(params: {
    roomId: string;
    userIds: string[];
  }): Promise<void> {
    const roomUsers = await this.redis.sMembers(
      this.roomUsersKey(params.roomId),
    );

    const userIdsToDelete = new Set([...roomUsers, ...params.userIds]);

    const multi = this.redis.multi();

    for (const userId of userIdsToDelete) {
      multi.del(this.userCallKey(userId));
      multi.del(this.pendingIceCandidatesKey(params.roomId, userId));
    }

    multi.del(this.roomUsersKey(params.roomId));

    await multi.exec();
  }
}
