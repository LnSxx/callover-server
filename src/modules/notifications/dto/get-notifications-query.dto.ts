import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import type { NotificationStatus } from '../schemas/notification.schema';

export class GetNotificationsQueryDto {
  @ApiProperty({ example: 50, default: 50, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit!: number;

  @ApiProperty({ example: 50, default: 0 })
  @Type(() => Number)
  @IsInt()
  offset!: number;

  @ApiProperty({
    example: 'unread',
    enum: ['read', 'unread'],
    required: false,
  })
  status?: NotificationStatus;
}
