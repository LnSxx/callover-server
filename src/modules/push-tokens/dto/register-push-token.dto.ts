import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import type {
  PushTokenPlatform,
  PushTokenProvider,
} from '../schemas/push-token.schema';

export class RegisterPushTokenDto {
  @ApiProperty({ enum: ['apns', 'fcm'] })
  @IsIn(['apns', 'fcm'])
  provider!: PushTokenProvider;

  @ApiProperty({ enum: ['macos', 'ios', 'android'] })
  @IsIn(['macos', 'ios', 'android'])
  platform!: PushTokenPlatform;

  @ApiProperty({ example: 'apns-device-token' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'com.example.plat' })
  @IsString()
  @IsNotEmpty()
  bundleId!: string;

  @ApiProperty({ example: 'local-installation-id' })
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @ApiProperty({ example: '1.0.0' })
  @IsString()
  @IsNotEmpty()
  appVersion!: string;
}
