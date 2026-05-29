import { Injectable } from '@nestjs/common';
import { PresenceService } from '../presence/presence.service';
import { CallPermissionsService } from '../call-permissions/call-permissions.service';
import { CallLifecycleService } from '../call-lifecycle/call-lifecycle.service';
import type {
  CA_TryInitiateCall_Result,
  CA_TryInitiateCall_Params,
  CA_AcceptCall_Params,
  CA_AcceptCall_Result,
  CA_DeclineCall_Params,
  CA_DeclineCall_Result,
  CA_CancelCall_Params,
  CA_CancelCall_Result,
  CA_EndCall_Params,
  CA_EndCall_Result,
} from './call-coordinator.types';

@Injectable()
export class CallCoordinatorService {
  constructor(
    private readonly presenceService: PresenceService,
    private readonly callPermissionsService: CallPermissionsService,
    private readonly callLifecycleService: CallLifecycleService,
  ) {}

  async tryInitiateCall(
    params: CA_TryInitiateCall_Params,
  ): Promise<CA_TryInitiateCall_Result> {
    const { callerUserId, calleeUserId, callerSocketId, type } = params;

    const callPermissions =
      await this.callPermissionsService.getCallPermissions({
        callerUserId: callerUserId,
        calleeUserId: calleeUserId,
      });

    if (!callPermissions.canCall) {
      return {
        success: false,
        reason: 'forbidden',
      };
    }

    const callStartResult = await this.callLifecycleService.tryStartCall({
      callerUserId,
      calleeUserId,
      callerSocketId,
      type,
    });

    if (!callStartResult.success) {
      return {
        success: false,
        reason: callStartResult.reason,
      };
    }

    const calleeSockets =
      await this.presenceService.getSocketIdsForUser(calleeUserId);

    if (calleeSockets.length === 0 && callPermissions.shouldWakeDevice) {
      // Implement APN/FCM or PushKit/CallKit wake up call to devices.
    }

    return {
      success: true,
      callRoomId: callStartResult.call.roomId,
      peerSockets: calleeSockets,
    };
  }

  async acceptCall(
    params: CA_AcceptCall_Params,
  ): Promise<CA_AcceptCall_Result> {
    return await this.callLifecycleService.registerCallAccept({
      calleeUserId: params.calleeUserId,
      calleeSocketId: params.calleeSocketId,
    });
  }

  async declineCall(
    params: CA_DeclineCall_Params,
  ): Promise<CA_DeclineCall_Result> {
    return await this.callLifecycleService.registerCallDecline({
      calleeUserId: params.calleeUserId,
    });
  }

  async cancelCall(
    params: CA_CancelCall_Params,
  ): Promise<CA_CancelCall_Result> {
    const callCancelResult = await this.callLifecycleService.registerCallCancel(
      {
        callerUserId: params.callerUserId,
      },
    );

    if (!callCancelResult.cancelled) {
      return {
        cancelled: false,
        reason: callCancelResult.reason,
      };
    }

    const calleeSockets = await this.presenceService.getSocketIdsForUser(
      callCancelResult.peerUserId,
    );

    return {
      cancelled: true,
      peerSockets: calleeSockets,
    };
  }

  async endCall(params: CA_EndCall_Params): Promise<CA_EndCall_Result> {
    return await this.callLifecycleService.registerCallEnd({
      userId: params.userId,
    });
  }

  async getCallRoomIdForUserIfHasActiveCall(
    userId: string,
  ): Promise<string | null> {
    const call = await this.callLifecycleService.getActiveCall(userId);
    return call?.roomId || null;
  }
}
