import { IsMongoId } from 'class-validator';

export class CallCancelMessageDto {
  @IsMongoId()
  toUserId!: string;
}
