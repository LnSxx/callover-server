import { Injectable } from '@nestjs/common';
import { CallsService } from '../calls/calls.service';
import { NotificationsService } from '../notifications/notifications.service';
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
import { CallTimeoutsSchedulerService } from '../call-timeouts/call-timeouts-scheduler.service';
import { CallLoggerService } from '../call-logs/call-logger.service';
import { CallTimeoutNotifierService } from '../call-timeouts-notifier/call-timeouts-notifier.service';
import { IceCandidate } from '../../entities/ice-candidate';

@Injectable()
export class CallLifecycleService {
  constructor(
    private readonly callsService: CallsService,
    private readonly notificationService: NotificationsService,
    private readonly callLoggerService: CallLoggerService,
    private readonly callTimeoutsScheduler: CallTimeoutsSchedulerService,
    private readonly callTimeoutNotifierService: CallTimeoutNotifierService,
  ) {}

  private readonly ringingTimeoutMs = 90_000; // 1 minute 30 seconds
  private readonly maxCallDurationMs = 21_600_000; // 6 hours

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
      participantUserId: result.call.userId,
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

    await this.callLoggerService.writePair({
      endedAt,
      caller: {
        call: declinedCallerCall,
        status: 'declined',
      },
      callee: {
        call: declinedCalleeCall,
        status: 'declined',
      },
    });

    return {
      declined: true,
      declinedCalleeCall,
      declinedCallerCall,
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

    await this.callLoggerService.writePair({
      endedAt,
      caller: {
        call: cancelledCallerCall,
        status: 'cancelled',
      },
      callee: {
        call: cancelledCalleeCall,
        status: 'cancelled',
      },
    });

    return {
      cancelled: true,
      cancelledCalleeCall,
      cancelledCallerCall,
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

    await this.callLoggerService.writePair({
      endedAt,
      caller: {
        call: endedCallerCall,
        status: 'completed',
        answeredAt: endedCallerCall.acceptedAt,
      },
      callee: {
        call: endedCalleeCall,
        status: 'completed',
        answeredAt: endedCalleeCall.acceptedAt,
      },
    });

    return {
      ended: true,
      endedCalleeCall,
      endedCallerCall,
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
    const timeoutResult = await this.callsService.timeoutRingingCall({
      roomId: params.roomId,
      calleeUserId: params.calleeUserId,
    });

    if (!timeoutResult.timedOut) {
      return;
    }

    const { timedOutCallerCall, timedOutCalleeCall } = timeoutResult;
    const endedAt = new Date();

    await this.callLoggerService.writePair({
      endedAt,
      caller: {
        call: timedOutCallerCall,
        status: 'no_answer',
      },
      callee: {
        call: timedOutCalleeCall,
        status: 'missed',
      },
    });

    await this.notificationService.createMissedCallNotification({
      userId: timedOutCalleeCall.userId,
      callId: timedOutCalleeCall.roomId,
      fromUserId: timedOutCalleeCall.peerUserId,
      callType: timedOutCalleeCall.type,
    });

    await this.callTimeoutNotifierService.notifyRingingTimeout({
      roomId: params.roomId,
      calleeUserId: params.calleeUserId,
    });
  }

  async registerMaxDurationTimeout(params: {
    roomId: string;
    participantUserId: string;
  }): Promise<void> {
    const endCallResult = await this.callsService.endCallByRoom({
      roomId: params.roomId,
      userId: params.participantUserId,
    });

    if (!endCallResult.ended) {
      return;
    }

    const { endedCallerCall, endedCalleeCall } = endCallResult;
    const endedAt = new Date();

    await this.callLoggerService.writePair({
      endedAt,
      caller: {
        call: endedCallerCall,
        status: 'completed',
        answeredAt: endedCallerCall.acceptedAt,
      },
      callee: {
        call: endedCalleeCall,
        status: 'completed',
        answeredAt: endedCalleeCall.acceptedAt,
      },
    });

    this.callTimeoutNotifierService.notifyMaxDurationTimeout({
      roomId: params.roomId,
    });
  }

  async addPendingIceCandidateForUser({
    roomId,
    targetUserId,
    candidate,
  }: {
    roomId: string;
    targetUserId: string;
    candidate: IceCandidate;
  }): Promise<void> {
    await this.callsService.addPendingIceCandidate({
      roomId,
      targetUserId,
      candidate,
    });
  }
}
