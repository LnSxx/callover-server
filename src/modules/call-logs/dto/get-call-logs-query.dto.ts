import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsMongoId,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import type { CallDirection, CallLogStatus } from '../types/call-logs.types';
import type { CallType } from '../../calls/entities/call';

export class GetCallLogsQueryDto {
  @ApiPropertyOptional({
    example: 'peer-user-id',
  })
  @IsOptional()
  @IsMongoId()
  peerUserId!: string;

  @ApiPropertyOptional({ example: 100, default: 100, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 0, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({
    example: 'completed',
    enum: [
      'completed',
      'missed',
      'declined',
      'cancelled',
      'no_answer',
      'failed',
    ],
    required: false,
  })
  @IsOptional()
  status?: CallLogStatus;

  @ApiPropertyOptional({
    example: 'audio',
    enum: ['audio', 'video'],
    required: false,
  })
  @IsOptional()
  type?: CallType;

  @ApiPropertyOptional({
    example: 'incoming',
    enum: ['incoming', 'outgoing'],
    required: false,
  })
  @IsOptional()
  direction?: CallDirection;

  @ApiPropertyOptional({ example: '2026-04-29T10:00:00.000Z' })
  @IsOptional()
  @IsDateString({ strict: true })
  startedAfter?: string;

  @ApiPropertyOptional({ example: '2026-04-29T10:00:00.000Z' })
  @IsOptional()
  @IsDateString({ strict: true })
  startedBefore?: string;
}
