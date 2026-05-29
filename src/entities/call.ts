export type CallType = 'audio' | 'video';
export type CallStatus = 'calling' | 'ringing' | 'active';
export type CallDirection = 'incoming' | 'outgoing';

export type Call = {
  type: CallType;
  direction: CallDirection;

  userId: string;
  socketId?: string;

  peerUserId: string;
  peerSocketId?: string;

  roomId: string;
  status: CallStatus;

  createdAt: Date;
  acceptedAt?: Date;
};
