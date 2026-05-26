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
import { User } from '../users/schemas/user.schema';

describe('ContactsService', () => {
  let service: ContactsService;

  const contactModelMock = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  };

  const userModelMock = {
    findById: jest.fn(),
  };

  const execMock = (value: unknown) => ({
    exec: jest.fn().mockResolvedValue(value),
  });

  const queryMock = (value: unknown) => ({
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
        UsersService,
        ContactsService,
        {
          provide: getModelToken(Contact.name),
          useValue: contactModelMock,
        },
        {
          provide: getModelToken(User.name),
          useValue: userModelMock,
        },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create contact', async () => {
      userModelMock.findById.mockReturnValue(execMock(user));
      contactModelMock.create.mockResolvedValue(contact);

      const result = await service.create({
        ownerId,
        contactUserId,
        alias: ' Catherine the Great ',
        note: ' Empress of Russia ',
      });

      expect(userModelMock.findById).toHaveBeenCalledWith(contactUserId);

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

    it('should throw NotFoundException if contact user does not exist', async () => {
      userModelMock.findById.mockReturnValue(execMock(null));

      await expect(
        service.create({
          ownerId,
          contactUserId,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(userModelMock.findById).toHaveBeenCalledWith(contactUserId);
      expect(contactModelMock.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if contactUserId is invalid', async () => {
      await expect(
        service.create({
          ownerId,
          contactUserId: 'invalid-id',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(contactModelMock.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if owner adds himself', async () => {
      await expect(
        service.create({
          ownerId,
          contactUserId: ownerId,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(contactModelMock.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate contact', async () => {
      userModelMock.findById.mockReturnValue(execMock(user));
      contactModelMock.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.create({
          ownerId,
          contactUserId,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException on unknown mongo error', async () => {
      userModelMock.findById.mockReturnValue(execMock(user));
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
    it('should find contacts with basic owner filter', async () => {
      const query = queryMock([contact]);
      contactModelMock.find.mockReturnValue(query);

      const result = await service.find({
        ownerId,
        limit: 50,
      });

      expect(contactModelMock.find).toHaveBeenCalledWith({
        ownerId,
      });

      expect(query.sort).toHaveBeenCalledWith({ updatedAt: 1, _id: 1 });
      expect(query.limit).toHaveBeenCalledWith(51);

      expect(result).toEqual({
        items: [contact],
        nextCursor: null,
      });
    });

    it('should apply filters', async () => {
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
        updatedAt: {
          $gt: changedAfter,
        },
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

    it('should clamp limit to maximum 100', async () => {
      const query = queryMock([]);
      contactModelMock.find.mockReturnValue(query);

      await service.find({
        ownerId,
        limit: 1000,
      });

      expect(query.limit).toHaveBeenCalledWith(101);
    });

    it('should clamp limit to minimum 1', async () => {
      const query = queryMock([]);
      contactModelMock.find.mockReturnValue(query);

      await service.find({
        ownerId,
        limit: 0,
      });

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

      const result = await service.find({
        ownerId,
        limit: 1,
      });

      expect(result.items).toEqual([firstContact]);
      expect(result.nextCursor).toEqual(expect.any(String));
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

      await service.find({
        ownerId,
        limit: 50,
        cursor,
      });

      expect(contactModelMock.find).toHaveBeenCalledWith({
        ownerId,
        $or: [
          {
            updatedAt: {
              $gt: new Date(cursorPayload.updatedAt),
            },
          },
          {
            updatedAt: new Date(cursorPayload.updatedAt),
            _id: {
              $gt: new Types.ObjectId(cursorPayload.id),
            },
          },
        ],
      });
    });

    it('should throw BadRequestException if cursor is invalid', async () => {
      await expect(
        service.find({
          ownerId,
          limit: 50,
          cursor: 'invalid-cursor',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should find one contact by ownerId and contactId', async () => {
      contactModelMock.findOne.mockReturnValue(execMock(contact));

      const result = await service.findOne({
        ownerId,
        contactId,
      });

      expect(contactModelMock.findOne).toHaveBeenCalledWith({
        _id: contactId,
        ownerId,
      });

      expect(result).toBe(contact);
    });

    it('should throw BadRequestException if contactId is invalid', async () => {
      await expect(
        service.findOne({
          ownerId,
          contactId: 'invalid-id',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if contact was not found', async () => {
      contactModelMock.findOne.mockReturnValue(execMock(null));

      await expect(
        service.findOne({
          ownerId,
          contactId,
        }),
      ).rejects.toThrow(NotFoundException);
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

      expect(contactModelMock.findOne).toHaveBeenCalledWith({
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
        isFavourite: true,
      };

      contactModelMock.findOneAndUpdate.mockReturnValue(
        execMock(updatedContact),
      );

      const result = await service.update({
        ownerId,
        contactId,
        alias: ' Peter ',
        note: 'Best friend',
        isFavourite: true,
      });

      expect(contactModelMock.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: contactId,
          ownerId,
        },
        {
          $set: {
            alias: 'Peter',
            isFavourite: true,
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

    it('should throw NotFoundException if contact does not exist', async () => {
      contactModelMock.findOne.mockReturnValue(execMock(null));

      await expect(
        service.update({
          ownerId,
          contactId,
          alias: 'Peter',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on duplicate mongo error', async () => {
      contactModelMock.findOne.mockReturnValue(execMock(contact));

      contactModelMock.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue({ code: 11000 }),
      });

      await expect(
        service.update({
          ownerId,
          contactId,
          alias: 'Peter',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should remove contact', async () => {
      contactModelMock.findOneAndDelete.mockReturnValue(execMock(contact));

      const result = await service.remove({
        ownerId,
        contactId,
      });

      expect(contactModelMock.findOneAndDelete).toHaveBeenCalledWith({
        _id: contactId,
        ownerId,
      });

      expect(result).toEqual({
        isDeleted: true,
      });
    });

    it('should throw BadRequestException if contactId is invalid', async () => {
      await expect(
        service.remove({
          ownerId,
          contactId: 'invalid-id',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if contact was not found', async () => {
      contactModelMock.findOneAndDelete.mockReturnValue(execMock(null));

      await expect(
        service.remove({
          ownerId,
          contactId,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
