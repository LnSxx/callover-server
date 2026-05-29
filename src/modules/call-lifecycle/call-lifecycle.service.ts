import { Injectable } from '@nestjs/common';
import { CallsService } from '../calls/calls.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CallLogsService } from '../call-logs/call-logs.service';
import { Call } from '../../entities/call';
import {
  CallAcceptParams,
  CallAcceptResult,
  CallCancelResult,
  CallDeclineResult,
  CallEndResult,
  CallInitParams,
  CallInitResult,
} from '../calls/calls.types';

@Injectable()
export class CallLifecycleService {
  constructor(
    private readonly callsService: CallsService,
    private readonly notificationService: NotificationsService,
    private readonly callLogsService: CallLogsService,
  ) {}

  async tryStartCall(params: CallInitParams): Promise<CallInitResult> {
    return await this.callsService.initiateCall(params);
  }

  async registerCallAccept(
    params: CallAcceptParams,
  ): Promise<CallAcceptResult> {
    const { calleeUserId, calleeSocketId } = params;

    return await this.callsService.acceptCall({
      calleeUserId: calleeUserId,
      calleeSocketId: calleeSocketId,
    });
  }

  async registerCallDecline(calleeUserId: string): Promise<CallDeclineResult> {
    const declineCallResult = await this.callsService.declineCall(calleeUserId);

    if (!declineCallResult.declined) {
      return {
        declined: false,
        reason: declineCallResult.reason,
      };
    }

    const { declinedCallerCall, declinedCalleeCall } = declineCallResult;
    const endedAt = new Date();

    if (declinedCallerCall) {
      await this.callLogsService.createCallLog({
        callId: declinedCallerCall.roomId,
        userId: declinedCallerCall.userId,
        peerUserId: declinedCallerCall.peerUserId,
        startedAt: declinedCallerCall.createdAt,
        answeredAt: undefined,
        endedAt: endedAt,
        direction: declinedCallerCall.direction,
        type: declinedCallerCall.type,
        status: 'declined',
      });
    }

    if (declinedCalleeCall) {
      await this.callLogsService.createCallLog({
        callId: declinedCalleeCall.roomId,
        userId: declinedCalleeCall.userId,
        peerUserId: declinedCalleeCall.peerUserId,
        startedAt: declinedCalleeCall.createdAt,
        answeredAt: undefined,
        endedAt: endedAt,
        direction: declinedCalleeCall.direction,
        type: declinedCalleeCall.type,
        status: 'declined',
      });
    }

    return {
      declined: true,
      declinedCalleeCall: declinedCalleeCall,
      declinedCallerCall: declinedCallerCall,
    };
  }

  async registerCallCancel(callerUserId: string): Promise<CallCancelResult> {
    const cancelCallResult = await this.callsService.cancelCall(callerUserId);

    if (!cancelCallResult.cancelled) {
      return {
        cancelled: false,
        reason: cancelCallResult.reason,
      };
    }

    const { cancelledCalleeCall, cancelledCallerCall } = cancelCallResult;
    const endedAt = new Date();

    if (cancelledCallerCall) {
      await this.callLogsService.createCallLog({
        callId: cancelledCallerCall.roomId,
        userId: cancelledCallerCall.userId,
        peerUserId: cancelledCallerCall.peerUserId,
        startedAt: cancelledCallerCall.createdAt,
        answeredAt: undefined,
        endedAt: endedAt,
        direction: cancelledCallerCall.direction,
        type: cancelledCallerCall.type,
        status: 'cancelled',
      });
    }

    if (cancelledCalleeCall) {
      await this.callLogsService.createCallLog({
        callId: cancelledCalleeCall.roomId,
        userId: cancelledCalleeCall.userId,
        peerUserId: cancelledCalleeCall.peerUserId,
        startedAt: cancelledCalleeCall.createdAt,
        answeredAt: undefined,
        endedAt: endedAt,
        direction: cancelledCalleeCall.direction,
        type: cancelledCalleeCall.type,
        status: 'missed',
      });

      await this.notificationService.createMissedCallNotification({
        userId: cancelledCalleeCall.userId,
        callId: cancelledCalleeCall.roomId,
        fromUserId: cancelledCalleeCall.peerUserId,
        callType: cancelledCalleeCall.type,
      });
    }

    return {
      cancelled: true,
      cancelledCalleeCall: cancelledCalleeCall,
      cancelledCallerCall: cancelledCallerCall,
    };
  }

  async registerCallEnd(userId: string): Promise<CallEndResult> {
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
    }

    return {
      ended: true,
      endedCalleeCall: endedCalleeCall,
      endedCallerCall: endedCallerCall,
    };
  }

  async getActiveCall(userId: string): Promise<Call | null> {
    return await this.callsService.getCall(userId);
  }
}
