import { IsString } from 'class-validator';
import { CallCancelEventPayload } from '../realtime.events';

export class CallCancelMessageDto implements CallCancelEventPayload {
  @IsString()
  toUserId: string;
}
