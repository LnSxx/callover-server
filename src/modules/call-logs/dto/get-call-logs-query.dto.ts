import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { CallLogStatus } from '../types/call-logs.types';
import type { CallDirection, CallType } from '../../../entities/call';

export class GetCallLogsQueryDto {
  @ApiPropertyOptional({
    example: 'peer-user-id',
  })
  @IsOptional()
  @IsMongoId()
  peerUserId?: string;

  @ApiPropertyOptional({ example: 100, default: 100, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

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
  @IsIn(['completed', 'missed', 'declined', 'cancelled', 'no_answer', 'failed'])
  status?: CallLogStatus;

  @ApiPropertyOptional({
    example: 'audio',
    enum: ['audio', 'video'],
    required: false,
  })
  @IsOptional()
  @IsIn(['audio', 'video'])
  type?: CallType;

  @ApiPropertyOptional({
    example: 'incoming',
    enum: ['incoming', 'outgoing'],
    required: false,
  })
  @IsOptional()
  @IsIn(['incoming', 'outgoing'])
  direction?: CallDirection;

  @ApiPropertyOptional({
    description: 'Pagination cursor returned by previous response',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
