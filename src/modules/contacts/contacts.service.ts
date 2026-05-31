import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Contact, ContactDocument } from './schemas/contact.schema';
import { Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service';

type CreateContactParams = {
  ownerId: string;
  contactUserId: string;
  alias?: string;
  note?: string;
  isFavourite?: boolean;
  isBlocked?: boolean;
  isMuted?: boolean;
};

type FindContactsParams = {
  ownerId: string;
  search?: string;
  changedAfter?: Date;
  isFavourite?: boolean;
  isBlocked?: boolean;
  isMuted?: boolean;
  limit: number;
  cursor?: string;
};

type UpdateContactParams = {
  ownerId: string;
  contactId: string;
  alias?: string;
  note?: string;
  isFavourite?: boolean;
  isBlocked?: boolean;
  isMuted?: boolean;
};

type ContactsCursor = {
  updatedAt: string;
  id: string;
};

@Injectable()
export class ContactsService {
  constructor(
    @InjectModel(Contact.name)
    private readonly contactModel: Model<ContactDocument>,
    private readonly usersService: UsersService,
  ) {}

  async create(params: CreateContactParams): Promise<ContactDocument> {
    if (!Types.ObjectId.isValid(params.contactUserId)) {
      throw new BadRequestException('Invalid contact user id');
    }

    if (params.ownerId === params.contactUserId) {
      throw new BadRequestException('Cannot create contact referencing owner');
    }

    const user = await this.usersService.findById(params.contactUserId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      return await this.contactModel.create({
        ownerId: params.ownerId,
        contactUserId: params.contactUserId,
        alias: params.alias?.trim(),
        note: params.note?.trim(),
        isFavourite: params.isFavourite ?? false,
        isBlocked: params.isBlocked ?? false,
        isMuted: params.isMuted ?? false,
      });
    } catch (error) {
      return this.handleMongoError(error);
    }
  }

  async find(params: FindContactsParams): Promise<{
    items: ContactDocument[];
    nextCursor: string | null;
  }> {
    const limit = Math.min(Math.max(params.limit, 1), 100);

    const filter: Record<string, unknown> = {
      ownerId: params.ownerId,
    };

    if (params.changedAfter) {
      filter.updatedAt = {
        $gt: params.changedAfter,
      };
    }

    if (params.isFavourite !== undefined) {
      filter.isFavourite = params.isFavourite;
    }

    if (params.isBlocked !== undefined) {
      filter.isBlocked = params.isBlocked;
    }

    if (params.isMuted !== undefined) {
      filter.isMuted = params.isMuted;
    }

    const search = params.search?.trim();

    if (search) {
      filter.alias = {
        $regex: this.escapeRegex(search),
        $options: 'i',
      };
    }

    if (params.cursor) {
      const cursor = this.decodeCursor(params.cursor);
      const cursorUpdatedAt = new Date(cursor.updatedAt);

      filter.$or = [
        {
          updatedAt: { $gt: cursorUpdatedAt },
        },
        {
          updatedAt: cursorUpdatedAt,
          _id: { $gt: new Types.ObjectId(cursor.id) },
        },
      ];
    }

    const items = await this.contactModel
      .find(filter)
      .sort({ updatedAt: 1, _id: 1 })
      .limit(limit + 1)
      .exec();

    const hasNextPage = items.length > limit;
    const pageItems = hasNextPage ? items.slice(0, limit) : items;
    const lastItem = pageItems[pageItems.length - 1];

    return {
      items: pageItems,
      nextCursor:
        hasNextPage && lastItem
          ? this.encodeCursor({
              updatedAt: lastItem.updatedAt.toISOString(),
              id: lastItem._id.toString(),
            })
          : null,
    };
  }

  async findOne({
    ownerId,
    contactId,
  }: {
    ownerId: string;
    contactId: string;
  }): Promise<ContactDocument> {
    if (!Types.ObjectId.isValid(contactId)) {
      throw new BadRequestException('Invalid contact id');
    }

    const contact = await this.contactModel
      .findOne({
        _id: contactId,
        ownerId,
      })
      .exec();

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  async findContactConnection({
    ownerId,
    contactUserId,
  }: {
    ownerId: string;
    contactUserId: string;
  }): Promise<ContactDocument | null> {
    const contact = await this.contactModel
      .findOne({
        ownerId,
        contactUserId: contactUserId,
      })
      .exec();

    if (!contact) {
      return null;
    }

    return contact;
  }

  async update(params: UpdateContactParams): Promise<ContactDocument> {
    const contact = await this.findOne({
      ownerId: params.ownerId,
      contactId: params.contactId,
    });

    const updateData = this.buildContactUpdateData(params, contact);

    if (Object.keys(updateData).length === 0) {
      return contact;
    }

    const updatedContact = await this.contactModel
      .findOneAndUpdate(
        {
          _id: params.contactId,
          ownerId: params.ownerId,
        },
        {
          $set: updateData,
        },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .exec()
      .catch((error) => this.handleMongoError(error));

    if (!updatedContact) {
      throw new NotFoundException('Contact not found');
    }

    return updatedContact;
  }

  async remove({
    ownerId,
    contactId,
  }: {
    ownerId: string;
    contactId: string;
  }): Promise<{ isDeleted: boolean }> {
    if (!Types.ObjectId.isValid(contactId)) {
      throw new BadRequestException('Invalid contact id');
    }

    const result = await this.contactModel
      .findOneAndDelete({
        _id: contactId,
        ownerId,
      })
      .exec();

    if (!result) {
      throw new NotFoundException('Contact not found');
    }

    return {
      isDeleted: true,
    };
  }

  private handleMongoError(error: unknown): never {
    if (this.isDuplicateKeyError(error)) {
      throw new ConflictException('Contact already exists');
    }

    throw new InternalServerErrorException('Contact operation failed');
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }

  private buildContactUpdateData(
    params: UpdateContactParams,
    contact: ContactDocument,
  ): Partial<Contact> {
    const updateData: Partial<Contact> = {};

    if (params.alias !== undefined) {
      const aliasNormalized = params.alias.trim();
      if (aliasNormalized !== contact.alias) {
        updateData.alias = aliasNormalized;
      }
    }

    if (params.note !== undefined) {
      const noteNormalized = params.note.trim();
      if (noteNormalized !== contact.note) {
        updateData.note = noteNormalized;
      }
    }

    // Adding to or removing from favourites
    if (params.isFavourite !== undefined) {
      if (params.isFavourite !== contact.isFavourite) {
        updateData.isFavourite = params.isFavourite;
      }
    }

    // Blocking/unblocking
    if (params.isBlocked !== undefined) {
      if (params.isBlocked !== contact.isBlocked) {
        updateData.isBlocked = params.isBlocked;
      }
    }

    // Muting/unmuting
    if (params.isMuted !== undefined) {
      if (params.isMuted !== contact.isMuted) {
        updateData.isMuted = params.isMuted;
      }
    }

    return updateData;
  }

  private encodeCursor(cursor: ContactsCursor): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }

  private decodeCursor(cursor: string): ContactsCursor {
    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as ContactsCursor;

      if (
        !decoded.updatedAt ||
        !decoded.id ||
        !Types.ObjectId.isValid(decoded.id)
      ) {
        throw new Error();
      }

      const updatedAt = new Date(decoded.updatedAt);

      if (Number.isNaN(updatedAt.getTime())) {
        throw new Error();
      }

      return decoded;
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
