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
import { CallType } from '../../entities/call';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  private readonly defaultTtlDays = 30;

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

  async createMissedCallNotification(params: {
    userId: string;
    callId: string;
    fromUserId: string;
    fromUserName?: string;
    callType: CallType;
  }): Promise<void> {
    await this.notificationModel.create({
      userId: params.userId,
      type: 'missed_call',
      status: 'unread',
      title: `Missed ${params.callType} call`,
      body: params.fromUserName
        ? `Missed ${params.callType} call from ${params.fromUserName}`
        : undefined,
      call: {
        callId: params.callId,
        fromUserId: params.fromUserId,
        fromUserName: params.fromUserName,
        callType: params.callType,
      },
      expiresAt: this.buildExpiresAt(),
    });
  }

  async createMutedCallNotification(params: {
    userId: string;
    callId: string;
    fromUserId: string;
    fromUserName?: string;
    callType: CallType;
  }): Promise<void> {
    await this.notificationModel.create({
      userId: params.userId,
      type: 'muted_call',
      status: 'unread',
      title: `Muted ${params.callType} call`,
      body: params.fromUserName
        ? `Muted ${params.callType} call from ${params.fromUserName}`
        : undefined,
      call: {
        callId: params.callId,
        fromUserId: params.fromUserId,
        fromUserName: params.fromUserName,
        callType: params.callType,
      },
      expiresAt: this.buildExpiresAt(),
    });
  }

  async createServiceNotification(params: {
    userId: string;
    title: string;
    body?: string;
    code?: string;
    payload?: Record<string, unknown>;
    expiresAt?: Date;
  }): Promise<void> {
    await this.notificationModel.create({
      userId: params.userId,
      type: 'service_message',
      status: 'unread',
      title: params.title,
      body: params.body,
      service: {
        code: params.code,
        payload: params.payload,
      },
      expiresAt: params.expiresAt ?? this.buildExpiresAt(),
    });
  }

  private buildExpiresAt(): Date {
    const expiresAt = new Date();

    expiresAt.setDate(expiresAt.getDate() + this.defaultTtlDays);

    return expiresAt;
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
