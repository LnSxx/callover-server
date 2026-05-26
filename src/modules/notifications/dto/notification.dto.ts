import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  NotificationStatus,
  NotificationType,
} from '../schemas/notification.schema';
import type { CallType } from '../../calls/entities/call';

export class NotificationDto {
  @ApiProperty({ example: 'notification-id' })
  id!: string;

  @ApiProperty({ example: 'user-id' })
  userId!: string;

  @ApiProperty({
    example: 'missed_call',
    enum: ['missed_call', 'muted_call', 'service_message'],
  })
  type!: NotificationType;

  @ApiProperty({
    example: 'unread',
    enum: ['unread', 'read'],
  })
  status!: NotificationStatus;

  @ApiProperty({ example: 'Missed video call from RC' })
  title!: string;

  @ApiPropertyOptional({ example: 'Call them back' })
  body?: string;

  @ApiPropertyOptional({
    example: {
      callId: 'call-id',
      fromUserId: 'user-id',
      fromUserName: 'user-name',
      callType: 'video',
    },
  })
  call?: NotificationCallDto;

  @ApiPropertyOptional({
    example: {
      code: 'service_code',
      payload: { key: 'value' },
    },
  })
  service?: {
    code?: string;
    payload?: Record<string, unknown>;
  };

  @ApiPropertyOptional({ example: '2026-04-29T10:00:00.000Z' })
  readAt?: string;

  @ApiProperty({ example: '2026-04-29T10:00:00.000Z' })
  expiresAt!: string;

  @ApiProperty({ example: '2026-04-29T10:00:00.000Z' })
  createdAt!: string;
}

export class NotificationCallDto {
  @ApiProperty({ example: 'call-id' })
  callId!: string;

  @ApiProperty({ example: 'user-id' })
  fromUserId!: string;

  @ApiPropertyOptional({ example: 'user-name' })
  fromUserName?: string;

  @ApiProperty({ example: 'video', enum: ['audio', 'video'] })
  callType!: CallType;
}
