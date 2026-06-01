import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CallDirection, CallType } from '../../../entities/call';
import type { CallLogStatus } from '../types/call-logs.types';

export class CallLogDto {
  @ApiProperty({ example: 'call-log-id' })
  id!: string;

  @ApiProperty({ example: 'call-id' })
  callId!: string;

  @ApiProperty({ example: 'user-id' })
  userId!: string;

  @ApiProperty({ example: 'peer-user-id' })
  peerUserId!: string;

  @ApiPropertyOptional({ example: 'Ivan the Terrible' })
  peerUserName?: string;

  @ApiProperty({ example: '2026-05-27T10:00:00.000Z' })
  startedAt!: string;

  @ApiPropertyOptional({ example: '2026-05-27T10:00:05.000Z' })
  answeredAt?: string;

  @ApiPropertyOptional({ example: '2026-05-27T10:10:00.000Z' })
  endedAt?: string;

  @ApiProperty({
    example: 'incoming',
    enum: ['incoming', 'outgoing'],
  })
  direction!: CallDirection;

  @ApiProperty({
    example: 'video',
    enum: ['audio', 'video'],
  })
  type!: CallType;

  @ApiProperty({
    example: 'completed',
    enum: [
      'completed',
      'missed',
      'declined',
      'cancelled',
      'no_answer',
      'failed',
    ],
  })
  status!: CallLogStatus;

  @ApiPropertyOptional({ example: 595 })
  durationSeconds?: number;

  @ApiPropertyOptional({ example: 5 })
  ringingDurationSeconds?: number;

  @ApiProperty({ example: '2026-05-27T10:00:00.000Z' })
  createdAt!: string;
}
