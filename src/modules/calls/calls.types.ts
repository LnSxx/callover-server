import { Call } from '../../entities/call';

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

export type CallEndFailReason = 'not-found';

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
