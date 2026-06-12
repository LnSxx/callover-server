export type IceCandidate = {
  fromUserId: string;
  sdp: string;
  sdpMLineIndex: number;
  sdpMid?: string;
};
