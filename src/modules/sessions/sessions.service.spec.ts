/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { SessionsService } from './sessions.service';
import { Session } from './schemas/session.schema';
import { DEFAULT_SESSION_TTL_DAYS } from './sessions.constants';

describe('SessionsService', () => {
  let service: SessionsService;

  const sessionModelMock = {
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    findOneAndDelete: jest.fn(),
    deleteMany: jest.fn(),
    updateOne: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn(),
  };

  const execMock = (value: unknown) => ({
    exec: jest.fn().mockResolvedValue(value),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: getModelToken(Session.name),
          useValue: sessionModelMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create session and return raw sessionId with expirationTime', async () => {
      configServiceMock.get.mockReturnValue('7');
      sessionModelMock.create.mockResolvedValue({});

      const result = await service.create({
        userId: 'user-id',
        ipAddress: '127.0.0.1',
        userAgent: 'jest-agent',
      });

      expect(result.sessionId).toEqual(expect.any(String));
      expect(result.sessionId).toHaveLength(64);
      expect(result.expirationTime).toBeInstanceOf(Date);

      expect(sessionModelMock.create).toHaveBeenCalledWith({
        sessionIdHash: expect.any(String),
        userId: 'user-id',
        ipAddress: '127.0.0.1',
        userAgent: 'jest-agent',
        lastActivity: expect.any(Date),
        isRevoked: false,
        expirationTime: expect.any(Date),
      });

      const createPayload = sessionModelMock.create.mock.calls[0][0];

      expect(createPayload.sessionIdHash).not.toBe(result.sessionId);
      expect(createPayload.sessionId).toBeUndefined();
    });

    it('should use default ttl if SESSION_TTL_DAYS is not set', async () => {
      configServiceMock.get.mockReturnValue(undefined);
      sessionModelMock.create.mockResolvedValue({});

      const before = Date.now();

      const result = await service.create({
        userId: 'user-id',
        ipAddress: '127.0.0.1',
        userAgent: 'jest-agent',
      });

      const after = Date.now();

      const expectedMin =
        before + DEFAULT_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
      const expectedMax =
        after + DEFAULT_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

      expect(result.expirationTime.getTime()).toBeGreaterThanOrEqual(
        expectedMin,
      );
      expect(result.expirationTime.getTime()).toBeLessThanOrEqual(expectedMax);
    });

    it('should throw error if SESSION_TTL_DAYS is invalid', async () => {
      configServiceMock.get.mockReturnValue('invalid');

      await expect(
        service.create({
          userId: 'user-id',
          ipAddress: '127.0.0.1',
          userAgent: 'jest-agent',
        }),
      ).rejects.toThrow('SESSION_TTL_DAYS must be a positive number');

      expect(sessionModelMock.create).not.toHaveBeenCalled();
    });

    it('should throw error if SESSION_TTL_DAYS is less than or equal to zero', async () => {
      configServiceMock.get.mockReturnValue('0');

      await expect(
        service.create({
          userId: 'user-id',
          ipAddress: '127.0.0.1',
          userAgent: 'jest-agent',
        }),
      ).rejects.toThrow('SESSION_TTL_DAYS must be a positive number');

      expect(sessionModelMock.create).not.toHaveBeenCalled();
    });
  });

  describe('findSessionById', () => {
    it('should find active session by hashed session id', async () => {
      const session = {
        userId: 'user-id',
        isRevoked: false,
      };

      sessionModelMock.findOne.mockReturnValue(execMock(session));

      const result = await service.findSessionById('raw-session-id');

      expect(sessionModelMock.findOne).toHaveBeenCalledWith({
        sessionIdHash: expect.any(String),
        isRevoked: false,
        expirationTime: { $gt: expect.any(Date) },
      });

      expect(result).toBe(session);
    });

    it('should return null if session was not found', async () => {
      sessionModelMock.findOne.mockReturnValue(execMock(null));

      const result = await service.findSessionById('raw-session-id');

      expect(result).toBeNull();
    });
  });

  describe('revokeSession', () => {
    it('should revoke active session', async () => {
      sessionModelMock.findOneAndUpdate.mockReturnValue(execMock({}));

      const result = await service.revokeSession('raw-session-id');

      expect(sessionModelMock.findOneAndUpdate).toHaveBeenCalledWith(
        {
          sessionIdHash: expect.any(String),
          isRevoked: false,
          expirationTime: { $gt: expect.any(Date) },
        },
        {
          $set: {
            isRevoked: true,
          },
        },
      );

      expect(result).toEqual({
        isRevoked: true,
      });
    });

    it('should return false if session was not found', async () => {
      sessionModelMock.findOneAndUpdate.mockReturnValue(execMock(null));

      const result = await service.revokeSession('raw-session-id');

      expect(result).toEqual({
        isRevoked: false,
      });
    });
  });

  describe('revokeAllSessionsForUserId', () => {
    it('should revoke all active sessions for user and return count', async () => {
      sessionModelMock.updateMany.mockReturnValue(
        execMock({
          modifiedCount: 3,
        }),
      );

      const result = await service.revokeAllSessionsForUserId('user-id');

      expect(sessionModelMock.updateMany).toHaveBeenCalledWith(
        {
          userId: 'user-id',
          isRevoked: false,
          expirationTime: { $gt: expect.any(Date) },
        },
        {
          $set: {
            isRevoked: true,
          },
        },
      );

      expect(result).toEqual({
        revokedCount: 3,
      });
    });
  });

  describe('deleteSession', () => {
    it('should delete session and return true', async () => {
      sessionModelMock.findOneAndDelete.mockReturnValue(execMock({}));

      const result = await service.deleteSession('raw-session-id');

      expect(sessionModelMock.findOneAndDelete).toHaveBeenCalledWith({
        sessionIdHash: expect.any(String),
      });

      expect(result).toEqual({
        isDeleted: true,
      });
    });

    it('should return false if session was not found', async () => {
      sessionModelMock.findOneAndDelete.mockReturnValue(execMock(null));

      const result = await service.deleteSession('raw-session-id');

      expect(result).toEqual({
        isDeleted: false,
      });
    });
  });

  describe('deleteAllSessionsForUserId', () => {
    it('should delete all sessions for user and return count', async () => {
      sessionModelMock.deleteMany.mockReturnValue(
        execMock({
          deletedCount: 5,
        }),
      );

      const result = await service.deleteAllSessionsForUserId('user-id');

      expect(sessionModelMock.deleteMany).toHaveBeenCalledWith({
        userId: 'user-id',
      });

      expect(result).toEqual({
        deletedCount: 5,
      });
    });
  });

  describe('updateActivity', () => {
    it('should update lastActivity for active session', async () => {
      sessionModelMock.updateOne.mockReturnValue(
        execMock({
          modifiedCount: 1,
        }),
      );

      const result = await service.updateActivity('raw-session-id');

      expect(sessionModelMock.updateOne).toHaveBeenCalledWith(
        {
          sessionIdHash: expect.any(String),
          isRevoked: false,
          expirationTime: { $gt: expect.any(Date) },
        },
        {
          $set: {
            lastActivity: expect.any(Date),
          },
        },
      );

      expect(result).toEqual({
        isUpdated: true,
      });
    });

    it('should return false if no session was updated', async () => {
      sessionModelMock.updateOne.mockReturnValue(
        execMock({
          modifiedCount: 0,
        }),
      );

      const result = await service.updateActivity('raw-session-id');

      expect(result).toEqual({
        isUpdated: false,
      });
    });
  });
});
