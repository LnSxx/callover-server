import { ApiProperty } from '@nestjs/swagger';
import { NotificationDto } from './notification.dto';
import type { GetNotificationPaginationResult } from '../notifications.types';

export class GetNotificationsResponseDto {
  @ApiProperty({ type: [NotificationDto] })
  data!: NotificationDto[];

  @ApiProperty({
    example: {
      limit: 50,
      offset: 0,
      count: 50,
      total: 200,
      next: 'https://api.callover-example.com/notifications?limit=50&offset=50',
      previous: null,
    },
  })
  pagination!: GetNotificationPaginationResult;
}
