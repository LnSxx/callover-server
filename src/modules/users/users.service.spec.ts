import bcrypt from 'bcrypt';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { BCRYPT_SALT_ROUNDS } from './user.constants';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  const userModelMock = {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };

  const execMock = (value: unknown) => ({
    exec: jest.fn().mockResolvedValue(value),
  });

  const selectExecMock = (value: unknown) => ({
    select: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(value),
    }),
  });

  const mockUser = {
    _id: 'user-id',
    username: 'john',
    email: 'john@example.com',
    passwordHash: 'hashed-password',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: userModelMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should normalize username, hash password and create user', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      userModelMock.create.mockResolvedValue(mockUser);

      const result = await service.create(' John ', 'password');

      expect(bcrypt.hash).toHaveBeenCalledWith('password', BCRYPT_SALT_ROUNDS);

      expect(userModelMock.create).toHaveBeenCalledWith({
        username: 'john',
        passwordHash: 'hashed-password',
      });

      expect(result).toBe(mockUser);
    });

    it('should throw ConflictException on duplicate key error', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      userModelMock.create.mockRejectedValue({
        code: 11000,
      });

      await expect(service.create('john', 'password')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw InternalServerErrorException on unknown error', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      userModelMock.create.mockRejectedValue(new Error('database error'));

      await expect(service.create('john', 'password')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      userModelMock.findById.mockReturnValue(execMock(mockUser));

      const result = await service.findById('user-id');

      expect(userModelMock.findById).toHaveBeenCalledWith('user-id');
      expect(result).toBe(mockUser);
    });

    it('should return null if user was not found', async () => {
      userModelMock.findById.mockReturnValue(execMock(null));

      const result = await service.findById('user-id');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should normalize username and find user', async () => {
      userModelMock.findOne.mockReturnValue(execMock(mockUser));

      const result = await service.findByUsername(' John ');

      expect(userModelMock.findOne).toHaveBeenCalledWith({
        username: 'john',
      });

      expect(result).toBe(mockUser);
    });
  });

  describe('findByUsernameWithPassword', () => {
    it('should normalize username and select passwordHash', async () => {
      const query = selectExecMock(mockUser);
      userModelMock.findOne.mockReturnValue(query);

      const result = await service.findByUsernameWithPassword(' John ');

      expect(userModelMock.findOne).toHaveBeenCalledWith({
        username: 'john',
      });

      expect(query.select).toHaveBeenCalledWith('+passwordHash');
      expect(result).toBe(mockUser);
    });
  });

  describe('updateProfile', () => {
    it('should update username and email', async () => {
      userModelMock.findByIdAndUpdate.mockReturnValue(execMock(mockUser));

      const result = await service.updateProfile('user-id', {
        username: ' NewName ',
        email: ' TEST@EMAIL.COM ',
      });

      expect(userModelMock.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id',
        {
          $set: {
            username: 'newname',
            email: 'test@email.com',
            isEmailVerified: false,
          },
        },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      );

      expect(result).toBe(mockUser);
    });

    it('should update only username', async () => {
      userModelMock.findByIdAndUpdate.mockReturnValue(execMock(mockUser));

      await service.updateProfile('user-id', {
        username: ' NewName ',
      });

      expect(userModelMock.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id',
        {
          $set: {
            username: 'newname',
          },
        },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      );
    });

    it('should update only email and reset isEmailVerified', async () => {
      userModelMock.findByIdAndUpdate.mockReturnValue(execMock(mockUser));

      await service.updateProfile('user-id', {
        email: ' TEST@EMAIL.COM ',
      });

      expect(userModelMock.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id',
        {
          $set: {
            email: 'test@email.com',
            isEmailVerified: false,
          },
        },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      );
    });

    it('should return current user if update params are empty', async () => {
      userModelMock.findById.mockReturnValue(execMock(mockUser));

      const result = await service.updateProfile('user-id', {});

      expect(userModelMock.findById).toHaveBeenCalledWith('user-id');
      expect(userModelMock.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(result).toBe(mockUser);
    });

    it('should throw ConflictException on duplicate key error', async () => {
      userModelMock.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue({
          code: 11000,
        }),
      });

      await expect(
        service.updateProfile('user-id', {
          username: 'john',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException on unknown error', async () => {
      userModelMock.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('database error')),
      });

      await expect(
        service.updateProfile('user-id', {
          username: 'john',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('changePassword', () => {
    it('should change password if current password is valid', async () => {
      const userWithPassword = {
        ...mockUser,
        passwordHash: 'old-hash',
      };

      userModelMock.findById.mockReturnValue(selectExecMock(userWithPassword));

      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      userModelMock.findByIdAndUpdate.mockReturnValue(execMock(mockUser));

      const result = await service.changePassword('user-id', {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      });

      expect(userModelMock.findById).toHaveBeenCalledWith('user-id');

      expect(bcrypt.compare).toHaveBeenNthCalledWith(
        1,
        'old-password',
        'old-hash',
      );

      expect(bcrypt.compare).toHaveBeenNthCalledWith(
        2,
        'new-password',
        'old-hash',
      );

      expect(bcrypt.hash).toHaveBeenCalledWith(
        'new-password',
        BCRYPT_SALT_ROUNDS,
      );

      expect(userModelMock.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id',
        {
          $set: {
            passwordHash: 'new-hash',
          },
        },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      );

      expect(result).toEqual({
        isChanged: true,
      });
    });

    it('should return false if user was not found', async () => {
      userModelMock.findById.mockReturnValue(selectExecMock(null));

      const result = await service.changePassword('user-id', {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      });

      expect(result).toEqual({
        isChanged: false,
      });

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(userModelMock.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if current password is invalid', async () => {
      const userWithPassword = {
        ...mockUser,
        passwordHash: 'old-hash',
      };

      userModelMock.findById.mockReturnValue(selectExecMock(userWithPassword));

      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.changePassword('user-id', {
          currentPassword: 'wrong-password',
          newPassword: 'new-password',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(userModelMock.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if new password is same as current password', async () => {
      const userWithPassword = {
        ...mockUser,
        passwordHash: 'old-hash',
      };

      userModelMock.findById.mockReturnValue(selectExecMock(userWithPassword));

      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      await expect(
        service.changePassword('user-id', {
          currentPassword: 'old-password',
          newPassword: 'old-password',
        }),
      ).rejects.toThrow(ConflictException);

      expect(userModelMock.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if password update fails', async () => {
      const userWithPassword = {
        ...mockUser,
        passwordHash: 'old-hash',
      };

      userModelMock.findById.mockReturnValue(selectExecMock(userWithPassword));

      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      userModelMock.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('database error')),
      });

      await expect(
        service.changePassword('user-id', {
          currentPassword: 'old-password',
          newPassword: 'new-password',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('remove', () => {
    it('should delete user and return true', async () => {
      userModelMock.findByIdAndDelete.mockReturnValue(execMock(mockUser));

      const result = await service.remove('user-id');

      expect(userModelMock.findByIdAndDelete).toHaveBeenCalledWith('user-id');
      expect(result).toEqual({
        isDeleted: true,
      });
    });

    it('should return false if user was not found', async () => {
      userModelMock.findByIdAndDelete.mockReturnValue(execMock(null));

      const result = await service.remove('user-id');

      expect(result).toEqual({
        isDeleted: false,
      });
    });
  });
});
