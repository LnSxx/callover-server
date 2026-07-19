import { Injectable } from '@nestjs/common';
import { PresenceService } from '../presence/presence.service';
import { CallPermissionsService } from '../call-permissions/call-permissions.service';
import { CallLifecycleService } from '../call-lifecycle/call-lifecycle.service';
import type {
  CA_TryInitiateCall_Result,
  CA_CancelCall_Result,
} from './call-coordinator.types';
import {
  CallAcceptParams,
  CallAcceptResult,
  CallDeclineResult,
  CallEndResult,
  CallInitParams,
} from '../calls/calls.types';
import { IceCandidate } from '../../entities/ice-candidate';

@Injectable()
export class CallCoordinatorService {
  constructor(
    private readonly presenceService: PresenceService,
    private readonly callPermissionsService: CallPermissionsService,
    private readonly callLifecycleService: CallLifecycleService,
  ) {}

  async tryInitiateCall(
    params: CallInitParams,
  ): Promise<CA_TryInitiateCall_Result> {
    const { fromUserId, toUserId } = params;

    const callPermissions =
      await this.callPermissionsService.getCallPermissions({
        callerUserId: fromUserId,
        calleeUserId: toUserId,
      });

    if (!callPermissions.canCall) {
      return {
        success: false,
        reason: 'forbidden',
      };
    }

    const calleeSockets =
      await this.presenceService.getSocketIdsForUser(toUserId);

    const callStartResult =
      await this.callLifecycleService.tryStartCall(params);

    if (!callStartResult.success) {
      return {
        success: false,
        reason: callStartResult.reason,
      };
    }

    return {
      success: true,
      callRoomId: callStartResult.call.roomId,
      peerSockets: calleeSockets,
    };
  }

  async acceptCall(params: CallAcceptParams): Promise<CallAcceptResult> {
    return this.callLifecycleService.registerCallAccept({
      calleeUserId: params.calleeUserId,
      calleeSocketId: params.calleeSocketId,
      remoteDescription: params.remoteDescription,
    });
  }

  async declineCall(calleeUserId: string): Promise<CallDeclineResult> {
    return this.callLifecycleService.registerCallDecline(calleeUserId);
  }

  async cancelCall(callerUserId: string): Promise<CA_CancelCall_Result> {
    const callCancelResult =
      await this.callLifecycleService.registerCallCancel(callerUserId);

    if (!callCancelResult.cancelled) {
      return {
        cancelled: false,
        reason: callCancelResult.reason,
      };
    }

    const calleeSockets = await this.presenceService.getSocketIdsForUser(
      callCancelResult.cancelledCallerCall.peerUserId,
    );

    return {
      cancelled: true,
      calleeSockets: calleeSockets,
    };
  }

  async endCall(userId: string): Promise<CallEndResult> {
    return this.callLifecycleService.registerCallEnd(userId);
  }

  async getCallRoomIdForUserIfHasActiveCall(
    userId: string,
  ): Promise<string | null> {
    const call = await this.callLifecycleService.getActiveCall(userId);
    return call?.roomId || null;
  }

  async getUserActiveSockets(userId: string): Promise<string[]> {
    const sockets = await this.presenceService.getSocketIdsForUser(userId);

    return sockets;
  }

  async handleIceCandidate({
    fromUserId,
    candidate,
  }: {
    fromUserId: string;
    candidate: IceCandidate;
  }): Promise<string[]> {
    const call = await this.callLifecycleService.getCurrentCall(fromUserId);

    if (!call) {
      return [];
    }

    const targetUserId = call.peerUserId;

    await this.callLifecycleService.addPendingIceCandidateForUser({
      roomId: call.roomId,
      targetUserId,
      candidate,
    });

    if (call.direction === 'incoming' && call.peerSocketId) {
      return [call.peerSocketId];
    }

    return this.getUserActiveSockets(targetUserId);
  }
}
