import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PushTokenDocument = HydratedDocument<PushToken> & {
  createdAt: Date;
  updatedAt: Date;
};

export type PushTokenProvider = 'apns' | 'fcm';
export type PushTokenPlatform = 'macos' | 'ios' | 'android';
export type PushTokenEnvironment = 'development' | 'production';

@Schema({ timestamps: true })
export class PushToken {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({
    required: true,
    enum: ['apns', 'fcm'],
  })
  provider!: PushTokenProvider;

  @Prop({
    required: true,
    enum: ['macos', 'ios', 'android'],
  })
  platform!: PushTokenPlatform;

  @Prop({ required: true })
  token!: string;

  @Prop({
    required: true,
    enum: ['development', 'production'],
  })
  environment!: PushTokenEnvironment;

  @Prop({ required: true })
  bundleId!: string;

  @Prop({ required: true })
  appVersion!: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: Date })
  invalidatedAt?: Date;
}

export const PushTokenSchema = SchemaFactory.createForClass(PushToken);

PushTokenSchema.index({ provider: 1, token: 1 }, { unique: true });

PushTokenSchema.index({
  userId: 1,
  isActive: 1,
});

PushTokenSchema.index({
  userId: 1,
  provider: 1,
  platform: 1,
});
