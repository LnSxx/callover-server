import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: true,
    unique: true,
  })
  username!: string;

  @Prop({
    unique: true,
    sparse: true,
  })
  email?: string;

  @Prop({
    required: false,
  })
  isEmailVerified?: boolean;

  @Prop({ required: true })
  passwordHash!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
