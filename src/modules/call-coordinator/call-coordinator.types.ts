import { CallCancelFailReason, CallInitFailReason } from '../calls/calls.types';

export type CA_TryInitiateCall_FailureReasons =
  | CallInitFailReason
  | 'forbidden'
  | 'callee-unavailable';

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

export type CA_CancelCall_Result =
  | {
      cancelled: true;
      calleeSockets: string[];
    }
  | {
      cancelled: false;
      reason: CallCancelFailReason;
    };
