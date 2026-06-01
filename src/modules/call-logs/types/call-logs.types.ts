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
  status?: CallLogStatus;
  type?: CallType;
  direction?: CallDirection;
  cursor?: string;
};

export type GetCallLogsResult = {
  data: CallLogDocument[];
  nextCursor: string | null;
};
