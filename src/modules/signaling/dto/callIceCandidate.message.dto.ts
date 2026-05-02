import { IsMongoId, IsString, MaxLength, MinLength } from 'class-validator';

export class CallIceCandidateMessageDto {
  @IsMongoId()
  toUserId!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(10_000)
  candidate!: string;
}
