import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ContactDocument = HydratedDocument<Contact>;

@Schema({ timestamps: true })
export class Contact {
  @Prop({ required: true })
  ownerId!: string;

  @Prop({ required: true })
  contactUserId!: string;

  @Prop()
  alias?: string;

  @Prop()
  note?: string;

  @Prop({ default: false })
  isFavourite?: boolean;

  @Prop({ default: false })
  isBlocked?: boolean;

  @Prop({ default: false })
  isMuted?: boolean;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);
