import { Call, CallType } from '../../entities/call';

export type CL_TryStartCall_Params = {
  callerUserId: string;
  calleeUserId: string;

  callerSocketId: string;
  type: CallType;
};

export type CL_TryStartCall_FailureReasons =
  | 'self-call'
  | 'caller-busy'
  | 'callee-busy';

export type CL_TryStartCall_Result =
  | {
      success: true;
      call: Call;
    }
  | {
      success: false;
      reason: CL_TryStartCall_FailureReasons;
    };

export type CL_AcceptCall_Params = {
  calleeUserId: string;
  calleeSocketId: string;
};

export type CL_AcceptCall_FailReason =
  | 'not-found'
  | 'unexpected-peer'
  | 'invalid-state';

export type CL_AcceptCall_Result =
  | {
      accepted: true;
      call: Call;
    }
  | {
      accepted: false;
      reason: CL_AcceptCall_FailReason;
    };

export type CL_DeclineCall_Params = {
  calleeUserId: string;
};

export type CL_DeclineCall_FailureReasons =
  | 'invalid-status'
  | 'not-found'
  | 'unexpected-peer';

export type CL_DeclineCall_Result =
  | {
      declined: true;
      callRoomId: string;
    }
  | {
      declined: false;
      reason: CL_DeclineCall_FailureReasons;
    };

export type CL_CancelCall_Params = {
  callerUserId: string;
};

export type CL_CancelCall_FailureReasons =
  | 'invalid-status'
  | 'not-found'
  | 'unexpected-peer';

export type CL_CancelCall_Result =
  | {
      cancelled: true;
      peerUserId: string;
    }
  | {
      cancelled: false;
      reason: CL_CancelCall_FailureReasons;
    };

export type CL_EndCall_Params = {
  userId: string;
};

export type CL_EndCall_FailureReasons = 'invalid-status' | 'not-found';

export type CL_EndCall_Result =
  | {
      ended: true;
      callRoomId: string;
    }
  | {
      ended: false;
      reason: CL_EndCall_FailureReasons;
    };
