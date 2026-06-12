export type RemoteDescriptionType = 'offer' | 'answer';

export type RemoteDescription = {
  type: RemoteDescriptionType;
  sdp: string;
};
