import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CallStatus, CallType } from '../entities/call';

export class CallDto {
  @ApiProperty({
    example: 'video',
    enum: ['audio', 'video'],
  })
  type!: CallType;

  @ApiProperty({
    example: 'user-id',
  })
  userId!: string;

  @ApiPropertyOptional({
    example: 'socket-id',
  })
  socketId?: string;

  @ApiProperty({
    example: 'peer-user-id',
  })
  peerUserId!: string;

  @ApiPropertyOptional({
    example: 'peer-socket-id',
  })
  peerSocketId?: string;

  @ApiProperty({
    example: 'room-id',
  })
  roomId!: string;

  @ApiProperty({
    example: 'ringing',
    enum: ['calling', 'ringing', 'active'],
  })
  status!: CallStatus;

  @ApiProperty({
    example: '2026-05-26T10:00:00.000Z',
  })
  createdAt!: string;

  @ApiPropertyOptional({
    example: '2026-05-26T10:00:10.000Z',
  })
  acceptedAt?: string;
}
