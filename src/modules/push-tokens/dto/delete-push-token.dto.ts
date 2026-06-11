import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import type { PushTokenProvider } from '../schemas/push-token.schema';

export class DeletePushTokenDto {
  @ApiProperty({ enum: ['apns', 'fcm'] })
  @IsIn(['apns', 'fcm'])
  provider!: PushTokenProvider;

  @ApiProperty({ example: 'apns-device-token' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
