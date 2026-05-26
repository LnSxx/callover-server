import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { REDIS_CLIENT } from '../redis/redis.provider';
import type { CallInitResult } from './calls.types';
import { Call, CallType } from './entities/call';

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
        reason: 'self_call',
      };
    }

    const callerBusy = await this.redis.exists(this.userCallKey(fromUserId));

    if (callerBusy) {
      return {
        success: false,
        reason: 'caller_busy',
      };
    }

    const calleeBusy = await this.redis.exists(this.userCallKey(toUserId));

    if (calleeBusy) {
      return {
        success: false,
        reason: 'callee_busy',
      };
    }

    const callId = randomUUID();
    const createdAt = new Date();

    const callerCall: Call = {
      type,
      userId: fromUserId,
      socketId,
      peerUserId: toUserId,
      roomId: callId,
      status: 'calling',
      createdAt,
    };

    const calleeCall: Call = {
      type,
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
    userId,
    socketId,
  }: {
    userId: string;
    socketId: string;
  }): Promise<Call | null> {
    const call = await this.getCall(userId);

    if (!call || call.status !== 'ringing') {
      return null;
    }

    const peerCall = await this.getCall(call.peerUserId);

    if (!peerCall || peerCall.status !== 'calling') {
      return null;
    }

    const acceptedAt = new Date();

    const updatedCall: Call = {
      ...call,
      socketId,
      peerSocketId: peerCall.socketId,
      status: 'active',
      acceptedAt,
    };

    const updatedPeerCall: Call = {
      ...peerCall,
      peerSocketId: socketId,
      status: 'active',
      acceptedAt,
    };

    await this.redis
      .multi()
      .set(this.userCallKey(userId), JSON.stringify(updatedCall), {
        EX: this.activeTtlSeconds,
      })
      .set(this.userCallKey(peerCall.userId), JSON.stringify(updatedPeerCall), {
        EX: this.activeTtlSeconds,
      })
      .expire(this.roomUsersKey(call.roomId), this.activeTtlSeconds)
      .exec();

    return updatedCall;
  }

  async endCall(userId: string): Promise<{
    ended: boolean;
  }> {
    const call = await this.getCall(userId);

    if (!call) {
      return {
        ended: false,
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
}
