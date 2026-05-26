import { Call } from './entities/call';

export type CallInitFailReason = 'self_call' | 'callee_busy' | 'caller_busy';

export type CallInitResult =
  | {
      success: true;
      call: Call;
    }
  | {
      success: false;
      reason: CallInitFailReason;
    };
