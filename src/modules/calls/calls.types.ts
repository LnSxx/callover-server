import { Call, CallType } from '../../entities/call';

export type CallInitParams = {
  type: CallType;
  fromUserId: string;
  toUserId: string;
  socketId: string;
};

export type CallInitFailReason = 'self-call' | 'callee-busy' | 'caller-busy';

export type CallInitResult =
  | {
      success: true;
      call: Call;
    }
  | {
      success: false;
      reason: CallInitFailReason;
    };

export type CallAcceptParams = {
  calleeUserId: string;
  calleeSocketId: string;
};

export type CallAcceptFailReason =
  | 'not-found'
  | 'unexpected-peer'
  | 'invalid-state';

export type CallAcceptResult =
  | {
      accepted: true;
      call: Call;
    }
  | {
      accepted: false;
      reason: CallAcceptFailReason;
    };

export type CallDeclineFailReason =
  | 'not-found'
  | 'invalid-status'
  | 'unexpected-peer';

export type CallDeclineResult =
  | {
      declined: true;
      declinedCallerCall: Call;
      declinedCalleeCall: Call;
    }
  | {
      declined: false;
      reason: CallDeclineFailReason;
    };

export type CallCancelFailReason =
  | 'not-found'
  | 'invalid-status'
  | 'unexpected-peer';

export type CallCancelResult =
  | {
      cancelled: true;
      cancelledCallerCall: Call;
      cancelledCalleeCall: Call;
    }
  | {
      cancelled: false;
      reason: CallCancelFailReason;
    };

export type CallEndFailReason =
  | 'invalid-status'
  | 'not-found'
  | 'unexpected-peer';

export type CallEndResult =
  | {
      ended: true;
      endedCallerCall: Call;
      endedCalleeCall: Call;
    }
  | {
      ended: false;
      reason: CallEndFailReason;
    };

export type CallRingingTimeoutFailReason =
  | 'not-found'
  | 'invalid-status'
  | 'unexpected-peer';

export type CallRingingTimeoutResult =
  | {
      timedOut: true;
      timedOutCallerCall: Call;
      timedOutCalleeCall: Call;
    }
  | {
      timedOut: false;
      reason: CallRingingTimeoutFailReason;
    };
