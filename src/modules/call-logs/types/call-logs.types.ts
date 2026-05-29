import { CallDirection, CallType } from '../../../entities/call';
import { CallLogDocument } from '../schemas/call-log.schema';

export type CallLogStatus =
  | 'completed'
  | 'missed'
  | 'declined'
  | 'cancelled'
  | 'no_answer'
  | 'failed';

export type GetCallLogsParams = {
  userId: string;
  peerUserId?: string;
  limit: number;
  offset: number;
  status?: CallLogStatus;
  type?: CallType;
  direction?: CallDirection;
  startedAfter?: Date;
  startedBefore?: Date;
};

export type GetCallLogsResult = {
  data: CallLogDocument[];
  limit: number;
  offset: number;
  count: number;
  total: number;
};

export type GetCallLogsPaginationResult = {
  limit: number;
  offset: number;
  count: number;
  total: number;
  next: string | null;
  previous: string | null;
};
