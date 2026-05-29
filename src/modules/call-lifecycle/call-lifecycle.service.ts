import { Injectable } from '@nestjs/common';
import { CallsService } from '../calls/calls.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CallLogsService } from '../call-logs/call-logs.service';
import type {
  CL_AcceptCall_Params,
  CL_AcceptCall_Result,
  CL_CancelCall_Params,
  CL_CancelCall_Result,
  CL_DeclineCall_Params,
  CL_DeclineCall_Result,
  CL_EndCall_Params,
  CL_EndCall_Result,
  CL_TryStartCall_Params,
  CL_TryStartCall_Result,
} from './call-lifecycle.types';
import { Call } from '../../entities/call';

@Injectable()
export class CallLifecycleService {
  constructor(
    private readonly callsService: CallsService,
    private readonly notificationService: NotificationsService,
    private readonly callLogsService: CallLogsService,
  ) {}

  async tryStartCall(
    params: CL_TryStartCall_Params,
  ): Promise<CL_TryStartCall_Result> {
    const { callerUserId, calleeUserId, callerSocketId, type } = params;

    const callInitResult = await this.callsService.initiateCall({
      type,
      fromUserId: callerUserId,
      toUserId: calleeUserId,
      socketId: callerSocketId,
    });

    if (!callInitResult.success) {
      return {
        success: false,
        reason: callInitResult.reason,
      };
    }

    return {
      success: true,
      call: callInitResult.call,
    };
  }

  async acceptCall(
    params: CL_AcceptCall_Params,
  ): Promise<CL_AcceptCall_Result> {
    const { calleeUserId, calleeSocketId } = params;

    const acceptedCall = await this.callsService.acceptCall({
      userId: calleeUserId,
      socketId: calleeSocketId,
    });

    if (!acceptedCall) {
      return null;
    }

    return acceptedCall;
  }

  async registerCallDecline(
    params: CL_DeclineCall_Params,
  ): Promise<CL_DeclineCall_Result> {
    const { calleeUserId } = params;
    const endCallResult = await this.callsService.endCall(calleeUserId);

    if (!endCallResult.ended) {
      return {
        declined: false,
        reason: endCallResult.reason,
      };
    }

    const { endedCallerCall, endedCalleeCall } = endCallResult;
    const endedAt = new Date();

    if (endedCallerCall) {
      await this.callLogsService.createCallLog({
        callId: endedCallerCall.roomId,
        userId: endedCallerCall.userId,
        peerUserId: endedCallerCall.peerUserId,
        startedAt: endedCallerCall.createdAt,
        answeredAt: undefined,
        endedAt: endedAt,
        direction: endedCallerCall.direction,
        type: endedCallerCall.type,
        status: 'declined',
      });
    }

    if (endedCalleeCall) {
      await this.callLogsService.createCallLog({
        callId: endedCalleeCall.roomId,
        userId: endedCalleeCall.userId,
        peerUserId: endedCalleeCall.peerUserId,
        startedAt: endedCalleeCall.createdAt,
        answeredAt: undefined,
        endedAt: endedAt,
        direction: endedCalleeCall.direction,
        type: endedCalleeCall.type,
        status: 'declined',
      });
    }

    return {
      declined: true,
      callRoomId: endedCalleeCall.roomId,
    };
  }

  async registerCallCancel(
    params: CL_CancelCall_Params,
  ): Promise<CL_CancelCall_Result> {
    const { callerUserId } = params;
    const endCallResult = await this.callsService.endCall(callerUserId);

    if (!endCallResult.ended) {
      return {
        cancelled: false,
        reason: endCallResult.reason,
      };
    }

    const { endedCallerCall, endedCalleeCall } = endCallResult;
    const endedAt = new Date();

    if (endedCallerCall) {
      await this.callLogsService.createCallLog({
        callId: endedCallerCall.roomId,
        userId: endedCallerCall.userId,
        peerUserId: endedCallerCall.peerUserId,
        startedAt: endedCallerCall.createdAt,
        answeredAt: undefined,
        endedAt: endedAt,
        direction: endedCallerCall.direction,
        type: endedCallerCall.type,
        status: 'cancelled',
      });
    }

    if (endedCalleeCall) {
      await this.callLogsService.createCallLog({
        callId: endedCalleeCall.roomId,
        userId: endedCalleeCall.userId,
        peerUserId: endedCalleeCall.peerUserId,
        startedAt: endedCalleeCall.createdAt,
        answeredAt: undefined,
        endedAt: endedAt,
        direction: endedCalleeCall.direction,
        type: endedCalleeCall.type,
        status: 'missed',
      });

      await this.notificationService.createMissedCallNotification({
        userId: endedCalleeCall.userId,
        callId: endedCalleeCall.roomId,
        fromUserId: endedCalleeCall.peerUserId,
        callType: endedCalleeCall.type,
      });
    }

    return {
      cancelled: true,
      peerUserId: endedCalleeCall.userId,
    };
  }

  async registerCallEnd(params: CL_EndCall_Params): Promise<CL_EndCall_Result> {
    const { userId } = params;

    const endCallResult = await this.callsService.endCall(userId);

    if (!endCallResult.ended) {
      return {
        ended: false,
        reason: endCallResult.reason,
      };
    }

    const { endedCallerCall, endedCalleeCall } = endCallResult;
    const endedAt = new Date();

    if (endedCallerCall) {
      await this.callLogsService.createCallLog({
        callId: endedCallerCall.roomId,
        userId: endedCallerCall.userId,
        peerUserId: endedCallerCall.peerUserId,
        startedAt: endedCallerCall.createdAt,
        answeredAt: endedCallerCall.acceptedAt,
        endedAt: endedAt,
        direction: endedCallerCall.direction,
        type: endedCallerCall.type,
        status: 'completed',
      });
    }

    if (endedCalleeCall) {
      await this.callLogsService.createCallLog({
        callId: endedCalleeCall.roomId,
        userId: endedCalleeCall.userId,
        peerUserId: endedCalleeCall.peerUserId,
        startedAt: endedCalleeCall.createdAt,
        answeredAt: endedCallerCall.acceptedAt,
        endedAt: endedAt,
        direction: endedCalleeCall.direction,
        type: endedCalleeCall.type,
        status: 'completed',
      });

      await this.notificationService.createMissedCallNotification({
        userId: endedCalleeCall.userId,
        callId: endedCalleeCall.roomId,
        fromUserId: endedCalleeCall.peerUserId,
        callType: endedCalleeCall.type,
      });
    }

    return {
      ended: true,
      callRoomId: endedCalleeCall.roomId,
    };
  }

  async getActiveCall(userId: string): Promise<Call | null> {
    return await this.callsService.getCall(userId);
  }
}
