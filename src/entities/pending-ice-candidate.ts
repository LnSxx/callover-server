import { IceCandidate } from './../../dist/entities/ice-candidate.d';

export type PendingIceCandidate = IceCandidate & {
  createdAt: Date;
};
