import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ContactsService } from './contacts.service';
import { Contact } from './schemas/contact.schema';
import { UsersService } from '../users/users.service';

describe('ContactsService', () => {
  let service: ContactsService;

  const contactModelMock = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  };

  const usersServiceMock = {
    findById: jest.fn(),
  };

  const execMock = <T>(value: T) => ({
    exec: jest.fn().mockResolvedValue(value),
  });

  const rejectedExecMock = (error: unknown) => ({
    exec: jest.fn().mockRejectedValue(error),
  });

  const queryMock = <T>(value: T) => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  });

  const ownerId = new Types.ObjectId().toString();
  const contactUserId = new Types.ObjectId().toString();
  const contactId = new Types.ObjectId().toString();

  const contact = {
    _id: new Types.ObjectId(contactId),
    ownerId,
    contactUserId,
    alias: 'Ivan',
    note: 'Best friend',
    isFavourite: false,
    isBlocked: false,
    isMuted: false,
    createdAt: new Date('2026-04-01T10:00:00.000Z'),
    updatedAt: new Date('2026-04-01T10:00:00.000Z'),
  };

  const user = {
    _id: new Types.ObjectId(contactUserId),
    username: 'catherine_the_great',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        {
          provide: getModelToken(Contact.name),
          useValue: contactModelMock,
        },
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create contact with normalized optional fields and default flags', async () => {
      usersServiceMock.findById.mockResolvedValue(user);
      contactModelMock.create.mockResolvedValue(contact);

      const result = await service.create({
        ownerId,
        contactUserId,
        alias: ' Catherine the Great ',
        note: ' Empress of Russia ',
      });

      expect(usersServiceMock.findById).toHaveBeenCalledWith(contactUserId);
      expect(contactModelMock.create).toHaveBeenCalledWith({
        ownerId,
        contactUserId,
        alias: 'Catherine the Great',
        note: 'Empress of Russia',
        isFavourite: false,
        isBlocked: false,
        isMuted: false,
      });
      expect(result).toBe(contact);
    });

    it('should create contact with provided flags', async () => {
      usersServiceMock.findById.mockResolvedValue(user);
      contactModelMock.create.mockResolvedValue(contact);

      await service.create({
        ownerId,
        contactUserId,
        isFavourite: true,
        isBlocked: true,
        isMuted: true,
      });

      expect(contactModelMock.create).toHaveBeenCalledWith({
        ownerId,
        contactUserId,
        alias: undefined,
        note: undefined,
        isFavourite: true,
        isBlocked: true,
        isMuted: true,
      });
    });

    it('should throw BadRequestException if contactUserId is invalid', async () => {
      await expect(
        service.create({
          ownerId,
          contactUserId: 'invalid-id',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(usersServiceMock.findById).not.toHaveBeenCalled();
      expect(contactModelMock.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if owner tries to add himself', async () => {
      await expect(
        service.create({
          ownerId,
          contactUserId: ownerId,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(usersServiceMock.findById).not.toHaveBeenCalled();
      expect(contactModelMock.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if contact user does not exist', async () => {
      usersServiceMock.findById.mockResolvedValue(null);

      await expect(
        service.create({
          ownerId,
          contactUserId,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(usersServiceMock.findById).toHaveBeenCalledWith(contactUserId);
      expect(contactModelMock.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate contact', async () => {
      usersServiceMock.findById.mockResolvedValue(user);
      contactModelMock.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.create({
          ownerId,
          contactUserId,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException on unknown mongo error', async () => {
      usersServiceMock.findById.mockResolvedValue(user);
      contactModelMock.create.mockRejectedValue(new Error('mongo failed'));

      await expect(
        service.create({
          ownerId,
          contactUserId,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('find', () => {
    it('should find contacts with owner filter, sorting, and limit plus one', async () => {
      const query = queryMock([contact]);
      contactModelMock.find.mockReturnValue(query);

      const result = await service.find({
        ownerId,
        limit: 50,
      });

      expect(contactModelMock.find).toHaveBeenCalledWith({ ownerId });
      expect(query.sort).toHaveBeenCalledWith({ updatedAt: 1, _id: 1 });
      expect(query.limit).toHaveBeenCalledWith(51);
      expect(result).toEqual({
        items: [contact],
        nextCursor: null,
      });
    });

    it('should apply optional filters', async () => {
      const changedAfter = new Date('2026-04-01T00:00:00.000Z');
      const query = queryMock([]);
      contactModelMock.find.mockReturnValue(query);

      await service.find({
        ownerId,
        changedAfter,
        isFavourite: true,
        isBlocked: false,
        isMuted: true,
        search: ' ivan ',
        limit: 20,
      });

      expect(contactModelMock.find).toHaveBeenCalledWith({
        ownerId,
        updatedAt: { $gt: changedAfter },
        isFavourite: true,
        isBlocked: false,
        isMuted: true,
        alias: {
          $regex: 'ivan',
          $options: 'i',
        },
      });
      expect(query.limit).toHaveBeenCalledWith(21);
    });

    it('should escape regex special characters in search', async () => {
      const query = queryMock([]);
      contactModelMock.find.mockReturnValue(query);

      await service.find({
        ownerId,
        search: 'ivan.*+?^${}()|[]\\',
        limit: 10,
      });

      expect(contactModelMock.find).toHaveBeenCalledWith({
        ownerId,
        alias: {
          $regex: 'ivan\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\',
          $options: 'i',
        },
      });
    });

    it('should ignore blank search', async () => {
      const query = queryMock([]);
      contactModelMock.find.mockReturnValue(query);

      await service.find({
        ownerId,
        search: '   ',
        limit: 10,
      });

      expect(contactModelMock.find).toHaveBeenCalledWith({ ownerId });
    });

    it('should clamp limit to maximum 100', async () => {
      const query = queryMock([]);
      contactModelMock.find.mockReturnValue(query);

      await service.find({ ownerId, limit: 1000 });

      expect(query.limit).toHaveBeenCalledWith(101);
    });

    it('should clamp limit to minimum 1', async () => {
      const query = queryMock([]);
      contactModelMock.find.mockReturnValue(query);

      await service.find({ ownerId, limit: 0 });

      expect(query.limit).toHaveBeenCalledWith(2);
    });

    it('should return nextCursor if there are more items', async () => {
      const firstContact = {
        ...contact,
        _id: new Types.ObjectId(),
        updatedAt: new Date('2026-04-01T10:00:00.000Z'),
      };
      const secondContact = {
        ...contact,
        _id: new Types.ObjectId(),
        updatedAt: new Date('2026-04-01T11:00:00.000Z'),
      };

      const query = queryMock([firstContact, secondContact]);
      contactModelMock.find.mockReturnValue(query);

      const result = await service.find({ ownerId, limit: 1 });

      expect(result.items).toEqual([firstContact]);
      expect(result.nextCursor).toEqual(expect.any(String));
    });

    it('should return null nextCursor if limit plus one item is not reached', async () => {
      const query = queryMock([contact]);
      contactModelMock.find.mockReturnValue(query);

      const result = await service.find({ ownerId, limit: 2 });

      expect(result).toEqual({
        items: [contact],
        nextCursor: null,
      });
    });

    it('should apply cursor filter', async () => {
      const cursorPayload = {
        updatedAt: '2026-04-01T10:00:00.000Z',
        id: new Types.ObjectId().toString(),
      };
      const cursor = Buffer.from(
        JSON.stringify(cursorPayload),
        'utf8',
      ).toString('base64url');

      const query = queryMock([]);
      contactModelMock.find.mockReturnValue(query);

      await service.find({ ownerId, limit: 50, cursor });

      expect(contactModelMock.find).toHaveBeenCalledWith({
        ownerId,
        $or: [
          {
            updatedAt: { $gt: new Date(cursorPayload.updatedAt) },
          },
          {
            updatedAt: new Date(cursorPayload.updatedAt),
            _id: { $gt: new Types.ObjectId(cursorPayload.id) },
          },
        ],
      });
    });

    it('should combine changedAfter and cursor filters', async () => {
      const changedAfter = new Date('2026-04-01T00:00:00.000Z');
      const cursorPayload = {
        updatedAt: '2026-04-01T10:00:00.000Z',
        id: new Types.ObjectId().toString(),
      };
      const cursor = Buffer.from(
        JSON.stringify(cursorPayload),
        'utf8',
      ).toString('base64url');

      const query = queryMock([]);
      contactModelMock.find.mockReturnValue(query);

      await service.find({ ownerId, changedAfter, limit: 50, cursor });

      expect(contactModelMock.find).toHaveBeenCalledWith({
        ownerId,
        updatedAt: { $gt: changedAfter },
        $or: [
          {
            updatedAt: { $gt: new Date(cursorPayload.updatedAt) },
          },
          {
            updatedAt: new Date(cursorPayload.updatedAt),
            _id: { $gt: new Types.ObjectId(cursorPayload.id) },
          },
        ],
      });
    });

    it.each([
      'invalid-cursor',
      Buffer.from(JSON.stringify({}), 'utf8').toString('base64url'),
      Buffer.from(
        JSON.stringify({ updatedAt: 'bad-date', id: new Types.ObjectId() }),
        'utf8',
      ).toString('base64url'),
      Buffer.from(
        JSON.stringify({ updatedAt: '2026-04-01T10:00:00.000Z', id: 'bad-id' }),
        'utf8',
      ).toString('base64url'),
    ])(
      'should throw BadRequestException if cursor is invalid: %s',
      async (cursor) => {
        await expect(
          service.find({
            ownerId,
            limit: 50,
            cursor,
          }),
        ).rejects.toThrow(BadRequestException);
      },
    );
  });

  describe('findOne', () => {
    it('should find one contact by ownerId and contactId', async () => {
      contactModelMock.findOne.mockReturnValue(execMock(contact));

      const result = await service.findOne({ ownerId, contactId });

      expect(contactModelMock.findOne).toHaveBeenCalledWith({
        _id: contactId,
        ownerId,
      });
      expect(result).toBe(contact);
    });

    it('should throw BadRequestException if contactId is invalid', async () => {
      await expect(
        service.findOne({ ownerId, contactId: 'invalid-id' }),
      ).rejects.toThrow(BadRequestException);

      expect(contactModelMock.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if contact was not found', async () => {
      contactModelMock.findOne.mockReturnValue(execMock(null));

      await expect(service.findOne({ ownerId, contactId })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findContactConnection', () => {
    it('should find contact by ownerId and contactUserId', async () => {
      contactModelMock.findOne.mockReturnValue(execMock(contact));

      const result = await service.findContactConnection({
        ownerId,
        contactUserId,
      });

      expect(contactModelMock.findOne).toHaveBeenCalledWith({
        ownerId,
        contactUserId,
      });
      expect(result).toBe(contact);
    });

    it('should return null if contact connection was not found', async () => {
      contactModelMock.findOne.mockReturnValue(execMock(null));

      const result = await service.findContactConnection({
        ownerId,
        contactUserId,
      });

      expect(result).toBeNull();
    });

    it('should not validate contactUserId', async () => {
      contactModelMock.findOne.mockReturnValue(execMock(null));

      const result = await service.findContactConnection({
        ownerId,
        contactUserId: 'not-object-id',
      });

      expect(contactModelMock.findOne).toHaveBeenCalledWith({
        ownerId,
        contactUserId: 'not-object-id',
      });
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update changed fields only', async () => {
      contactModelMock.findOne.mockReturnValue(execMock(contact));

      const updatedContact = {
        ...contact,
        alias: 'Peter',
        note: 'New note',
        isFavourite: true,
        isBlocked: true,
        isMuted: true,
      };
      contactModelMock.findOneAndUpdate.mockReturnValue(
        execMock(updatedContact),
      );

      const result = await service.update({
        ownerId,
        contactId,
        alias: ' Peter ',
        note: ' New note ',
        isFavourite: true,
        isBlocked: true,
        isMuted: true,
      });

      expect(contactModelMock.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: contactId,
          ownerId,
        },
        {
          $set: {
            alias: 'Peter',
            note: 'New note',
            isFavourite: true,
            isBlocked: true,
            isMuted: true,
          },
        },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      );
      expect(result).toBe(updatedContact);
    });

    it('should return existing contact if nothing changed', async () => {
      contactModelMock.findOne.mockReturnValue(execMock(contact));

      const result = await service.update({
        ownerId,
        contactId,
        alias: 'Ivan',
        note: 'Best friend',
        isFavourite: false,
        isBlocked: false,
        isMuted: false,
      });

      expect(contactModelMock.findOneAndUpdate).not.toHaveBeenCalled();
      expect(result).toBe(contact);
    });

    it('should return existing contact if update params contain no update fields', async () => {
      contactModelMock.findOne.mockReturnValue(execMock(contact));

      const result = await service.update({ ownerId, contactId });

      expect(contactModelMock.findOneAndUpdate).not.toHaveBeenCalled();
      expect(result).toBe(contact);
    });

    it('should throw BadRequestException if contactId is invalid', async () => {
      await expect(
        service.update({ ownerId, contactId: 'invalid-id', alias: 'Peter' }),
      ).rejects.toThrow(BadRequestException);

      expect(contactModelMock.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if contact does not exist before update', async () => {
      contactModelMock.findOne.mockReturnValue(execMock(null));

      await expect(
        service.update({ ownerId, contactId, alias: 'Peter' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if contact disappeared during update', async () => {
      contactModelMock.findOne.mockReturnValue(execMock(contact));
      contactModelMock.findOneAndUpdate.mockReturnValue(execMock(null));

      await expect(
        service.update({ ownerId, contactId, alias: 'Peter' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on duplicate mongo error', async () => {
      contactModelMock.findOne.mockReturnValue(execMock(contact));
      contactModelMock.findOneAndUpdate.mockReturnValue(
        rejectedExecMock({ code: 11000 }),
      );

      await expect(
        service.update({ ownerId, contactId, alias: 'Peter' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException on unknown mongo error', async () => {
      contactModelMock.findOne.mockReturnValue(execMock(contact));
      contactModelMock.findOneAndUpdate.mockReturnValue(
        rejectedExecMock(new Error('mongo failed')),
      );

      await expect(
        service.update({ ownerId, contactId, alias: 'Peter' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('remove', () => {
    it('should remove contact', async () => {
      contactModelMock.findOneAndDelete.mockReturnValue(execMock(contact));

      const result = await service.remove({ ownerId, contactId });

      expect(contactModelMock.findOneAndDelete).toHaveBeenCalledWith({
        _id: contactId,
        ownerId,
      });
      expect(result).toEqual({ isDeleted: true });
    });

    it('should throw BadRequestException if contactId is invalid', async () => {
      await expect(
        service.remove({ ownerId, contactId: 'invalid-id' }),
      ).rejects.toThrow(BadRequestException);

      expect(contactModelMock.findOneAndDelete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if contact was not found', async () => {
      contactModelMock.findOneAndDelete.mockReturnValue(execMock(null));

      await expect(service.remove({ ownerId, contactId })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
