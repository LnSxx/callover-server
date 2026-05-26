export type CallType = 'audio' | 'video';
export type CallStatus = 'calling' | 'ringing' | 'active';

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
