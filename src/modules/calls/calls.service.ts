import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import type { Call, CallInitResult, CallType } from './calls.types';

@Injectable()
export class CallsService {
  // userId -> call
  private calls: Map<string, Call> = new Map();

  initiateCall({
    type,
    fromUserId,
    toUserId,
    socketId,
  }: {
    type: CallType;
    fromUserId: string;
    toUserId: string;
    socketId: string;
  }): CallInitResult {
    if (fromUserId === toUserId) {
      return {
        success: false,
        reason: 'self_call',
      };
    }

    if (this.calls.has(fromUserId)) {
      return {
        success: false,
        reason: 'caller_busy',
      };
    }

    if (this.calls.has(toUserId)) {
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

    this.calls.set(fromUserId, callerCall);
    this.calls.set(toUserId, calleeCall);

    return {
      success: true,
      call: callerCall,
    };
  }

  acceptCall({
    userId,
    socketId,
  }: {
    userId: string;
    socketId: string;
  }): Call | null {
    const call = this.calls.get(userId);

    if (!call || call.status !== 'ringing') {
      return null;
    }

    const peerCall = this.calls.get(call.peerUserId);

    if (!peerCall || peerCall.status !== 'calling') {
      return null;
    }

    const acceptedAt = new Date();

    call.socketId = socketId;
    call.peerSocketId = peerCall.socketId;
    call.status = 'active';
    call.acceptedAt = acceptedAt;

    peerCall.peerSocketId = socketId;
    peerCall.status = 'active';
    peerCall.acceptedAt = acceptedAt;

    return call;
  }

  endCall(userId: string): {
    ended: boolean;
  } {
    const call = this.calls.get(userId);

    if (!call) {
      return {
        ended: false,
      };
    }

    const peersCall = this.calls.get(call.peerUserId);

    if (peersCall) {
      this.calls.delete(peersCall.userId);
    }
    this.calls.delete(userId);
    return {
      ended: true,
    };
  }

  getCall(userId: string): Call | null {
    return this.calls.get(userId) || null;
  }
}
