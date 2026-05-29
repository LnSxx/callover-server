import { Call, CallType } from '../../entities/call';

export type CA_TryInitiateCall_Params = {
  callerUserId: string;
  calleeUserId: string;

  callerSocketId: string;
  type: CallType;
};

export type CA_TryInitiateCall_FailureReasons =
  | 'self-call'
  | 'caller-busy'
  | 'callee-busy'
  | 'forbidden';

export type CA_TryInitiateCall_Result =
  | {
      success: true;
      callRoomId: string;
      peerSockets: string[];
    }
  | {
      success: false;
      reason: CA_TryInitiateCall_FailureReasons;
    };

export type CA_AcceptCall_Params = {
  calleeUserId: string;
  calleeSocketId: string;
};

export type CA_AcceptCall_FailReason =
  | 'not-found'
  | 'unexpected-peer'
  | 'invalid-state';

export type CA_AcceptCall_Result =
  | {
      accepted: true;
      call: Call;
    }
  | {
      accepted: false;
      reason: CA_AcceptCall_FailReason;
    };

export type CA_DeclineCall_Params = {
  calleeUserId: string;
};

export type CA_DeclineCall_FailureReasons =
  | 'invalid-status'
  | 'not-found'
  | 'unexpected-peer';

export type CA_DeclineCall_Result =
  | {
      declined: true;
      callRoomId: string;
    }
  | {
      declined: false;
      reason: CA_DeclineCall_FailureReasons;
    };

export type CA_CancelCall_Params = {
  callerUserId: string;
};

export type CA_CancelCall_FailureReasons =
  | 'invalid-status'
  | 'not-found'
  | 'unexpected-peer';

export type CA_CancelCall_Result =
  | {
      cancelled: true;
      peerSockets: string[];
    }
  | {
      cancelled: false;
      reason: CA_CancelCall_FailureReasons;
    };

export type CA_EndCall_Params = {
  userId: string;
};

export type CA_EndCall_FailureReasons = 'invalid-status' | 'not-found';

export type CA_EndCall_Result =
  | {
      ended: true;
      callRoomId: string;
    }
  | {
      ended: false;
      reason: CA_EndCall_FailureReasons;
    };
