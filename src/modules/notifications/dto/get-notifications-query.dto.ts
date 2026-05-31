import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import type { NotificationStatus } from '../schemas/notification.schema';

export class GetNotificationsQueryDto {
  @ApiPropertyOptional({ example: 50, default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit!: number;

  @ApiPropertyOptional({ example: 50, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  offset!: number;

  @ApiPropertyOptional({
    example: 'unread',
    enum: ['read', 'unread'],
    required: false,
  })
  @IsOptional()
  status?: NotificationStatus;
}
