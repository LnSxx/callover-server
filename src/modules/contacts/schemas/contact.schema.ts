import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ContactDocument = HydratedDocument<Contact> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class Contact {
  @Prop({ required: true })
  ownerId!: string;

  @Prop({ required: true })
  contactUserId!: string;

  @Prop({ type: String, trim: true, maxlength: 80 })
  alias?: string;

  @Prop({ type: String, trim: true, maxlength: 500 })
  note?: string;

  @Prop({ type: Boolean, required: true, default: false })
  isFavourite!: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  isBlocked!: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  isMuted!: boolean;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);

// Ensures a user cannot have duplicate contacts for the same user
ContactSchema.index({ ownerId: 1, contactUserId: 1 }, { unique: true });

// Optimizes fetching all contacts for a specific user
ContactSchema.index({ ownerId: 1 });

// Optimizes reverse lookups, for example finding users who saved this user as a contact
ContactSchema.index({ contactUserId: 1 });

// Optimizes cursor pagination and sync queries for a user's contacts
ContactSchema.index({ ownerId: 1, updatedAt: 1, _id: 1 });

// Optimizes filtering blocked contacts for a user
ContactSchema.index({ ownerId: 1, isBlocked: 1 });

// Optimizes filtering favourite contacts for a user
ContactSchema.index({ ownerId: 1, isFavourite: 1 });

// Optimizes filtering muted contacts for a user
ContactSchema.index({ ownerId: 1, isMuted: 1 });
