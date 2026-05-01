export type CallType = 'audio' | 'video';
export type CallStatus = 'calling' | 'ringing' | 'active';
export type CallInitFailReason = 'self_call' | 'callee_busy' | 'caller_busy';

export type Call = {
  type: CallType;

  userId: string;
  socketId?: string;

  peerUserId: string;
  peerSocketId?: string;

  roomId: string;
  status: CallStatus;

  createdAt: Date;
  acceptedAt?: Date;
};

export type CallInitResult =
  | {
      success: true;
      call: Call;
    }
  | {
      success: false;
      reason: CallInitFailReason;
    };
