import { IsMongoId } from 'class-validator';

export class CallEndMessageDto {
  @IsMongoId()
  toUserId!: string;
}
