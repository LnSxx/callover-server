import { IceCandidate } from './ice-candidate';

export type PendingIceCandidate = IceCandidate & {
  createdAt: Date;
};
