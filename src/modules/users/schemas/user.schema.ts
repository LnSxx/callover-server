import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
  })
  username!: string;

  @Prop({
    type: String,
    trim: true,
    lowercase: true,
  })
  email?: string;

  @Prop({
    required: true,
    default: false,
  })
  isEmailVerified!: boolean;

  @Prop({
    required: true,
    select: false,
  })
  passwordHash!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: 'string' },
    },
  },
);
