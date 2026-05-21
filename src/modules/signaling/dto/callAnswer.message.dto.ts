import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class CallAnswerMessageDto {
  @IsMongoId()
  toUserId!: string;

  @IsOptional()
  @IsString()
  sdp!: string;
}
