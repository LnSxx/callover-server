import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { CallType } from '../../../entities/call';

export type NotificationDocument = HydratedDocument<Notification> & {
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationType = 'missed_call' | 'muted_call' | 'service_message';

export type NotificationStatus = 'unread' | 'read';

@Schema({
  timestamps: true,
})
export class Notification {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: ['missed_call', 'muted_call', 'service_message'],
    index: true,
  })
  type!: NotificationType;

  @Prop({
    type: String,
    required: true,
    enum: ['unread', 'read'],
    default: 'unread',
    index: true,
  })
  status!: NotificationStatus;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String })
  body?: string;

  @Prop({
    type: {
      callId: { type: String },
      fromUserId: { type: Types.ObjectId },
      fromUserName: { type: String },
      callType: { type: String, enum: ['audio', 'video'] },
    },
    default: undefined,
  })
  call?: {
    callId: string;
    fromUserId: Types.ObjectId;
    fromUserName?: string;
    callType: CallType;
  };

  @Prop({
    type: {
      code: { type: String },
      payload: { type: Object },
    },
    default: undefined,
  })
  service?: {
    code?: string;
    payload?: Record<string, unknown>;
  };

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({
    type: Date,
    required: true,
    index: { expires: 0 },
  })
  expiresAt!: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({
  userId: 1,
  createdAt: -1,
});

NotificationSchema.index({
  userId: 1,
  status: 1,
  createdAt: -1,
});

NotificationSchema.index(
  {
    userId: 1,
    type: 1,
    'call.callId': 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      'call.callId': { $exists: true },
    },
  },
);
