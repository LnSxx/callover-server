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
import { CallTimeoutsSchedulerService } from '../call-timeouts/call-timeouts-scheduler.service';

@Injectable()
export class CallLifecycleService {
  constructor(
    private readonly callsService: CallsService,
    private readonly notificationService: NotificationsService,
    private readonly callLogsService: CallLogsService,
    private readonly callTimeoutsScheduler: CallTimeoutsSchedulerService,
  ) {}

  private readonly ringingTimeoutMs = 90_000;
  private readonly maxCallDurationMs = 21_600_000;

  async tryStartCall(params: CallInitParams): Promise<CallInitResult> {
    const result = await this.callsService.initiateCall(params);

    if (!result.success) {
      return result;
    }

    await this.callTimeoutsScheduler.scheduleRingingTimeout({
      roomId: result.call.roomId,
      calleeUserId: params.toUserId,
      delayMs: this.ringingTimeoutMs,
    });

    return result;
  }

  async registerCallAccept(
    params: CallAcceptParams,
  ): Promise<CallAcceptResult> {
    const result = await this.callsService.acceptCall({
      calleeUserId: params.calleeUserId,
      calleeSocketId: params.calleeSocketId,
    });

    if (!result.accepted) {
      return result;
    }

    await this.callTimeoutsScheduler.scheduleMaxDurationTimeout({
      roomId: result.call.roomId,
      userId: result.call.userId,
      delayMs: this.maxCallDurationMs,
    });

    return result;
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

  async registerRingingTimeout(params: {
    roomId: string;
    calleeUserId: string;
  }): Promise<void> {
    const result = await this.callsService.timeoutRingingCall({
      roomId: params.roomId,
      calleeUserId: params.calleeUserId,
    });

    if (!result.timedOut) {
      return;
    }

    const { timedOutCallerCall, timedOutCalleeCall } = result;
    const endedAt = new Date();

    await this.createLogFromCall({
      call: timedOutCallerCall,
      status: 'no_answer',
      endedAt,
    });

    await this.createLogFromCall({
      call: timedOutCalleeCall,
      status: 'missed',
      endedAt,
    });

    await this.notificationService.createMissedCallNotification({
      userId: timedOutCalleeCall.userId,
      callId: timedOutCalleeCall.roomId,
      fromUserId: timedOutCalleeCall.peerUserId,
      callType: timedOutCalleeCall.type,
    });
  }

  async registerMaxDurationEnd(params: {
    roomId: string;
    userId: string;
  }): Promise<void> {
    const result = await this.callsService.endCallByRoom({
      roomId: params.roomId,
      userId: params.userId,
    });

    if (!result.ended) {
      return;
    }

    const { endedCallerCall, endedCalleeCall } = result;
    const endedAt = new Date();

    await this.createLogFromCall({
      call: endedCallerCall,
      status: 'completed',
      endedAt,
      answeredAt: endedCallerCall.acceptedAt,
    });

    await this.createLogFromCall({
      call: endedCalleeCall,
      status: 'completed',
      endedAt,
      answeredAt: endedCalleeCall.acceptedAt,
    });
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
