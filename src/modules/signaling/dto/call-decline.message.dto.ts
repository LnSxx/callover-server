import { IsMongoId } from 'class-validator';

export class CallDeclineMessageDto {
  @IsMongoId()
  toUserId!: string;
}
