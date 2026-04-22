import { IsString } from 'class-validator';
import type { CallAnswerEventPayload } from '../realtime.events';

export class CallAnswerMessageDto implements CallAnswerEventPayload {
  @IsString()
  toUserId!: string;

  sdp?: string | null;
}
