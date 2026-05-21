import { IsMongoId, IsNumber, IsOptional, IsString } from 'class-validator';

export class CallIceCandidateMessageDto {
  @IsMongoId()
  toUserId!: string;

  @IsString()
  sdp!: string;

  @IsNumber()
  sdpMLineIndex!: number;

  @IsOptional()
  @IsString()
  sdpMid?: string;
}
