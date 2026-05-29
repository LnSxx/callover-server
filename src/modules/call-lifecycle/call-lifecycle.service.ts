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
import { CallLogStatus } from '../call-logs/types/call-logs.types';

@Injectable()
export class CallLifecycleService {
  constructor(
    private readonly callsService: CallsService,
    private readonly notificationService: NotificationsService,
    private readonly callLogsService: CallLogsService,
  ) {}

  async tryStartCall(params: CallInitParams): Promise<CallInitResult> {
    return this.callsService.initiateCall(params);
  }

  async registerCallAccept(
    params: CallAcceptParams,
  ): Promise<CallAcceptResult> {
    const { calleeUserId, calleeSocketId } = params;

    return this.callsService.acceptCall({
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

    await this.createLogFromCall({
      call: declinedCallerCall,
      status: 'declined',
      endedAt: endedAt,
    });

    await this.createLogFromCall({
      call: declinedCalleeCall,
      status: 'declined',
      endedAt: endedAt,
    });

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

    await this.createLogFromCall({
      call: cancelledCallerCall,
      status: 'cancelled',
      endedAt: endedAt,
    });

    await this.createLogFromCall({
      call: cancelledCalleeCall,
      status: 'missed',
      endedAt: endedAt,
    });

    await this.notificationService.createMissedCallNotification({
      userId: cancelledCalleeCall.userId,
      callId: cancelledCalleeCall.roomId,
      fromUserId: cancelledCalleeCall.peerUserId,
      callType: cancelledCalleeCall.type,
    });

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

    await this.createLogFromCall({
      call: endedCallerCall,
      status: 'completed',
      endedAt: endedAt,
      answeredAt: endedCallerCall.acceptedAt,
    });

    await this.createLogFromCall({
      call: endedCalleeCall,
      status: 'completed',
      endedAt: endedAt,
      answeredAt: endedCalleeCall.acceptedAt,
    });

    return {
      ended: true,
      endedCalleeCall: endedCalleeCall,
      endedCallerCall: endedCallerCall,
    };
  }

  async getActiveCall(userId: string): Promise<Call | null> {
    const call = await this.callsService.getCall(userId);

    if (!call || call.status !== 'active') {
      return null;
    }

    return call;
  }

  private async createLogFromCall(params: {
    call: Call;
    status: CallLogStatus;
    endedAt: Date;
    answeredAt?: Date;
  }): Promise<void> {
    await this.callLogsService.createCallLog({
      callId: params.call.roomId,
      userId: params.call.userId,
      peerUserId: params.call.peerUserId,
      startedAt: params.call.createdAt,
      answeredAt: params.answeredAt,
      endedAt: params.endedAt,
      direction: params.call.direction,
      type: params.call.type,
      status: params.status,
    });
  }
}
