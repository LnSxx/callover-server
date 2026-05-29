import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { REDIS_CLIENT } from '../redis/redis.provider';
import type {
  CallAcceptResult,
  CallCancelResult,
  CallDeclineResult,
  CallEndResult,
  CallInitResult,
} from './calls.types';
import { Call, CallType } from '../../entities/call';

@Injectable()
export class CallsService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: RedisClientType,
  ) {}

  private readonly ringingTtlSeconds = 120;
  private readonly activeTtlSeconds = 21_600;

  private userCallKey(userId: string): string {
    return `calls:user:${userId}`;
  }

  private roomUsersKey(roomId: string): string {
    return `calls:room:${roomId}:users`;
  }

  async initiateCall({
    type,
    fromUserId,
    toUserId,
    socketId,
  }: {
    type: CallType;
    fromUserId: string;
    toUserId: string;
    socketId: string;
  }): Promise<CallInitResult> {
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

  async acceptCall({
    calleeUserId,
    calleeSocketId,
  }: {
    calleeUserId: string;
    calleeSocketId: string;
  }): Promise<CallAcceptResult> {
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
    const call = await this.getCall(calleeUserId);

    if (!call) {
      return {
        declined: false,
        reason: 'not-found',
      };
    }

    const peerCall = await this.getCall(call.peerUserId);

    if (!peerCall) {
      return {
        declined: false,
        reason: 'not-found',
      };
    }

    if (call.direction !== 'incoming' || peerCall.direction !== 'outgoing') {
      return {
        declined: false,
        reason: 'unexpected-peer',
      };
    }

    if (call.status !== 'ringing' || peerCall.status !== 'calling') {
      return {
        declined: false,
        reason: 'invalid-status',
      };
    }

    const roomUsers = await this.redis.sMembers(this.roomUsersKey(call.roomId));

    const multi = this.redis.multi();

    for (const roomUserId of roomUsers) {
      multi.del(this.userCallKey(roomUserId));
    }

    multi.del(this.roomUsersKey(call.roomId));

    await multi.exec();

    return {
      declined: true,
      declinedCalleeCall: call,
      declinedCallerCall: peerCall,
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

    const roomUsers = await this.redis.sMembers(
      this.roomUsersKey(callerCall.roomId),
    );

    const multi = this.redis.multi();

    for (const roomUserId of roomUsers) {
      multi.del(this.userCallKey(roomUserId));
    }

    multi.del(this.roomUsersKey(callerCall.roomId));

    await multi.exec();

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

    if (call.status !== 'active' || peerCall.status !== 'active') {
      return {
        ended: false,
        reason: 'invalid-status',
      };
    }

    const roomUsers = await this.redis.sMembers(this.roomUsersKey(call.roomId));

    const multi = this.redis.multi();

    for (const roomUserId of roomUsers) {
      multi.del(this.userCallKey(roomUserId));
    }

    multi.del(this.roomUsersKey(call.roomId));

    await multi.exec();

    return {
      ended: true,
      endedCallerCall: call.direction === 'outgoing' ? call : peerCall,
      endedCalleeCall: call.direction === 'incoming' ? call : peerCall,
    };
  }

  async getCall(userId: string): Promise<Call | null> {
    const rawCall = await this.redis.get(this.userCallKey(userId));

    if (!rawCall) {
      return null;
    }

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
  }

  async getCurrentRingingCall(userId: string): Promise<Call | null> {
    const rawCall = await this.redis.get(this.userCallKey(userId));

    if (!rawCall) {
      return null;
    }

    const parsedCall = JSON.parse(rawCall) as Omit<
      Call,
      'createdAt' | 'acceptedAt'
    > & {
      createdAt: string;
      acceptedAt?: string;
    };

    if (parsedCall.status === 'ringing') {
      return {
        ...parsedCall,
        createdAt: new Date(parsedCall.createdAt),
        acceptedAt: parsedCall.acceptedAt
          ? new Date(parsedCall.acceptedAt)
          : undefined,
      };
    }
    return null;
  }
}
