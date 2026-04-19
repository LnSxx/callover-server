import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SessionDocument = HydratedDocument<Session>;

@Schema({ timestamps: true })
export class Session {
  @Prop({ required: true, unique: true })
  sessionId!: string;

  @Prop({ required: true })
  userId!: string;

  @Prop({ type: String, required: false })
  ipAddress?: string;

  @Prop({ type: String, required: false })
  userAgent?: string;

  @Prop({ required: true })
  lastActivity!: Date;

  @Prop({ required: true })
  isRevoked!: boolean;

  @Prop({ required: true })
  expirationTime!: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
