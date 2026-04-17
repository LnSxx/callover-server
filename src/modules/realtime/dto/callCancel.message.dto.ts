import { IsString } from 'class-validator';
import { CallCancelIncomingEventPayload } from '../realtime.events';

export class CallCancelMessageDto implements CallCancelIncomingEventPayload {
  @IsString()
  fromUserId: string;
}
