import { IsString } from 'class-validator';
import { CallEndEventPayload } from '../realtime.events';

export class CallCancelMessageDto implements CallEndEventPayload {
  @IsString()
  toUserId!: string;
}
