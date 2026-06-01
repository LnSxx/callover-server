import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import type { CallDirection, CallType } from '../../../entities/call';
import type { CallLogStatus } from '../types/call-logs.types';

export type CallLogDocument = HydratedDocument<CallLog> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({
  timestamps: true,
})
export class CallLog {
  @Prop({
    type: String,
    required: true,
    index: true,
  })
  callId!: string;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  peerUserId!: Types.ObjectId;

  @Prop({
    type: String,
  })
  peerUserName?: string;

  @Prop({
    type: Date,
    required: true,
    index: true,
  })
  startedAt!: Date;

  @Prop({
    type: Date,
  })
  answeredAt?: Date;

  @Prop({
    type: Date,
  })
  endedAt?: Date;

  @Prop({
    type: String,
    required: true,
    enum: ['incoming', 'outgoing'],
    index: true,
  })
  direction!: CallDirection;

  @Prop({
    type: String,
    required: true,
    enum: ['audio', 'video'],
  })
  type!: CallType;

  @Prop({
    type: String,
    required: true,
    enum: [
      'completed',
      'missed',
      'declined',
      'cancelled',
      'no_answer',
      'failed',
    ],
    index: true,
  })
  status!: CallLogStatus;

  @Prop({
    type: Number,
    min: 0,
  })
  durationSeconds?: number;

  @Prop({
    type: Number,
    min: 0,
  })
  ringingDurationSeconds?: number;
}

export const CallLogSchema = SchemaFactory.createForClass(CallLog);

CallLogSchema.index({
  userId: 1,
  startedAt: -1,
});

CallLogSchema.index({
  userId: 1,
  peerUserId: 1,
  startedAt: -1,
});

CallLogSchema.index({
  userId: 1,
  status: 1,
  startedAt: -1,
});

CallLogSchema.index({ userId: 1, startedAt: -1, _id: -1 });

CallLogSchema.index({ userId: 1, peerUserId: 1, startedAt: -1, _id: -1 });
