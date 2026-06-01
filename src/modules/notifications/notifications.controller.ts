import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { GetNotificationsResponseDto } from './dto/get-notifications-response.dto';
import { NotificationDocument } from './schemas/notification.schema';
import { NotificationDto } from './dto/notification.dto';
import { MarkNotificationsAsReadDto } from './dto/mark-notifications-as-read.dto';
import { MarkNotificationsAsReadResponseDto } from './dto/mark-notifications-as-read.response.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    enum: ['read', 'unread'],
  })
  async get(
    @CurrentUser() user: { id: string },
    @Query() query: GetNotificationsQueryDto,
  ): Promise<GetNotificationsResponseDto> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const result = await this.notificationsService.get({
      userId: user.id,
      limit,
      offset,
      status: query.status,
    });

    return {
      data: result.data.map((notification) =>
        this.toNotificationDto(notification),
      ),
      totalUnreadCount: result.totalUnreadCount,
      pagination: {
        limit: result.limit,
        offset: result.offset,
        count: result.count,
        total: result.total,
        next: this.buildPaginationUrl({
          limit,
          offset: offset + limit,
          status: query.status,
          shouldBuild: offset + result.count < result.total,
        }),
        previous: this.buildPaginationUrl({
          limit,
          offset: Math.max(0, offset - limit),
          status: query.status,
          shouldBuild: offset > 0,
        }),
      },
    };
  }

  @Patch('read')
  async markAsRead(
    @CurrentUser() user: { id: string },
    @Body() body: MarkNotificationsAsReadDto,
  ): Promise<MarkNotificationsAsReadResponseDto> {
    const result = await this.notificationsService.markAsRead(
      user.id,
      body.notificationIds,
    );

    return {
      unreadRemain: result.unreadRemain,
    };
  }

  private buildPaginationUrl({
    limit,
    offset,
    status,
    shouldBuild,
  }: {
    limit: number;
    offset: number;
    status?: 'read' | 'unread';
    shouldBuild: boolean;
  }): string | null {
    if (!shouldBuild) {
      return null;
    }

    const params = new URLSearchParams();

    params.set('limit', limit.toString());
    params.set('offset', offset.toString());

    if (status) {
      params.set('status', status);
    }

    return `/notifications?${params.toString()}`;
  }

  private toNotificationDto(
    notification: NotificationDocument,
  ): NotificationDto {
    return {
      id: notification._id.toString(),
      userId: notification.userId.toString(),
      type: notification.type,
      status: notification.status,
      title: notification.title,
      body: notification.body,
      call: notification.call
        ? {
            callId: notification.call.callId,
            fromUserId: notification.call.fromUserId.toString(),
            fromUserName: notification.call.fromUserName,
            callType: notification.call.callType,
          }
        : undefined,
      service: notification.service
        ? {
            code: notification.service.code,
            payload: notification.service.payload,
          }
        : undefined,
      readAt: notification.readAt?.toISOString(),
      expiresAt: notification.expiresAt.toISOString(),
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
