import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';
import { Model } from 'mongoose';
import type {
  GetNotificationsParams,
  GetNotificationsResult,
} from './notifications.types';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async get(params: GetNotificationsParams): Promise<GetNotificationsResult> {
    const { userId, limit, offset, status } = params;

    const filter: {
      userId: string;
      status?: 'read' | 'unread';
    } = { userId };

    if (status) {
      filter.status = status;
    }

    const [data, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      limit,
      offset,
      count: data.length,
      total,
    };
  }

  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    await this.notificationModel.updateMany(
      {
        _id: { $in: notificationIds },
        userId,
      },
      {
        status: 'read',
        readAt: new Date(),
      },
    );
  }
}
