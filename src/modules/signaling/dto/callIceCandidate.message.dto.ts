import { IsMongoId, IsString } from 'class-validator';

export class CallIceCandidateMessageDto {
  @IsMongoId()
  toUserId!: string;

  @IsString()
  candidate!: string;
}
