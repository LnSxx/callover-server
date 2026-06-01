/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CallLogsService } from './call-logs.service';

describe('CallLogsService', () => {
  let service: CallLogsService;

  let callLogModel: {
    find: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(() => {
    callLogModel = {
      find: jest.fn(),
      create: jest.fn(),
    };

    service = new CallLogsService(callLogModel as any);
  });

  describe('get', () => {
    it('should return first page with nextCursor when there are more items', async () => {
      const userId = new Types.ObjectId().toString();

      const firstItemId = new Types.ObjectId();
      const secondItemId = new Types.ObjectId();
      const extraItemId = new Types.ObjectId();

      const callLogs = [
        {
          _id: firstItemId,
          callId: 'call-1',
          userId: new Types.ObjectId(userId),
          peerUserId: new Types.ObjectId(),
          startedAt: new Date('2026-05-27T10:02:00.000Z'),
          status: 'completed',
        },
        {
          _id: secondItemId,
          callId: 'call-2',
          userId: new Types.ObjectId(userId),
          peerUserId: new Types.ObjectId(),
          startedAt: new Date('2026-05-27T10:01:00.000Z'),
          status: 'missed',
        },
        {
          _id: extraItemId,
          callId: 'call-3',
          userId: new Types.ObjectId(userId),
          peerUserId: new Types.ObjectId(),
          startedAt: new Date('2026-05-27T10:00:00.000Z'),
          status: 'cancelled',
        },
      ];

      const execFind = jest.fn().mockResolvedValue(callLogs);
      const limit = jest.fn().mockReturnValue({ exec: execFind });
      const sort = jest.fn().mockReturnValue({ limit });

      callLogModel.find.mockReturnValue({ sort });

      const result = await service.get({
        userId,
        limit: 2,
      });

      expect(callLogModel.find).toHaveBeenCalledWith({
        userId: new Types.ObjectId(userId),
      });

      expect(sort).toHaveBeenCalledWith({ startedAt: -1, _id: -1 });
      expect(limit).toHaveBeenCalledWith(3);

      expect(result.data).toEqual([callLogs[0], callLogs[1]]);
      expect(result.nextCursor).toEqual(
        Buffer.from(
          JSON.stringify({
            startedAt: callLogs[1].startedAt.toISOString(),
            id: secondItemId.toString(),
          }),
          'utf8',
        ).toString('base64url'),
      );
    });

    it('should return null nextCursor when there are no more items', async () => {
      const userId = new Types.ObjectId().toString();

      const callLogs = [
        {
          _id: new Types.ObjectId(),
          callId: 'call-1',
          userId: new Types.ObjectId(userId),
          peerUserId: new Types.ObjectId(),
          startedAt: new Date('2026-05-27T10:00:00.000Z'),
          status: 'completed',
        },
      ];

      const execFind = jest.fn().mockResolvedValue(callLogs);
      const limit = jest.fn().mockReturnValue({ exec: execFind });
      const sort = jest.fn().mockReturnValue({ limit });

      callLogModel.find.mockReturnValue({ sort });

      const result = await service.get({
        userId,
        limit: 2,
      });

      expect(limit).toHaveBeenCalledWith(3);

      expect(result).toEqual({
        data: callLogs,
        nextCursor: null,
      });
    });

    it('should clamp limit to max 100 and request one extra item', async () => {
      const userId = new Types.ObjectId().toString();

      const execFind = jest.fn().mockResolvedValue([]);
      const limit = jest.fn().mockReturnValue({ exec: execFind });
      const sort = jest.fn().mockReturnValue({ limit });

      callLogModel.find.mockReturnValue({ sort });

      await service.get({
        userId,
        limit: 999,
      });

      expect(limit).toHaveBeenCalledWith(101);
    });

    it('should clamp limit to min 1 and request one extra item', async () => {
      const userId = new Types.ObjectId().toString();

      const execFind = jest.fn().mockResolvedValue([]);
      const limit = jest.fn().mockReturnValue({ exec: execFind });
      const sort = jest.fn().mockReturnValue({ limit });

      callLogModel.find.mockReturnValue({ sort });

      await service.get({
        userId,
        limit: 0,
      });

      expect(limit).toHaveBeenCalledWith(2);
    });

    it('should apply all filters', async () => {
      const userId = new Types.ObjectId().toString();
      const peerUserId = new Types.ObjectId().toString();

      const execFind = jest.fn().mockResolvedValue([]);
      const limit = jest.fn().mockReturnValue({ exec: execFind });
      const sort = jest.fn().mockReturnValue({ limit });

      callLogModel.find.mockReturnValue({ sort });

      await service.get({
        userId,
        peerUserId,
        limit: 20,
        status: 'missed',
        type: 'video',
        direction: 'incoming',
      });

      const expectedFilter = {
        $and: [
          {
            userId: new Types.ObjectId(userId),
          },
          {
            peerUserId: new Types.ObjectId(peerUserId),
          },
          {
            status: 'missed',
          },
          {
            type: 'video',
          },
          {
            direction: 'incoming',
          },
        ],
      };

      expect(callLogModel.find).toHaveBeenCalledWith(expectedFilter);
      expect(sort).toHaveBeenCalledWith({ startedAt: -1, _id: -1 });
      expect(limit).toHaveBeenCalledWith(21);
    });

    it('should apply cursor filter for loading older call logs', async () => {
      const userId = new Types.ObjectId().toString();
      const cursorId = new Types.ObjectId();
      const cursorStartedAt = '2026-05-27T10:00:00.000Z';

      const cursor = Buffer.from(
        JSON.stringify({
          startedAt: cursorStartedAt,
          id: cursorId.toString(),
        }),
        'utf8',
      ).toString('base64url');

      const execFind = jest.fn().mockResolvedValue([]);
      const limit = jest.fn().mockReturnValue({ exec: execFind });
      const sort = jest.fn().mockReturnValue({ limit });

      callLogModel.find.mockReturnValue({ sort });

      await service.get({
        userId,
        limit: 50,
        cursor,
      });

      expect(callLogModel.find).toHaveBeenCalledWith({
        $and: [
          {
            userId: new Types.ObjectId(userId),
          },
          {
            $or: [
              {
                startedAt: {
                  $lt: new Date(cursorStartedAt),
                },
              },
              {
                startedAt: new Date(cursorStartedAt),
                _id: {
                  $lt: new Types.ObjectId(cursorId.toString()),
                },
              },
            ],
          },
        ],
      });

      expect(sort).toHaveBeenCalledWith({ startedAt: -1, _id: -1 });
      expect(limit).toHaveBeenCalledWith(51);
    });

    it('should apply filters together with cursor', async () => {
      const userId = new Types.ObjectId().toString();
      const peerUserId = new Types.ObjectId().toString();
      const cursorId = new Types.ObjectId();
      const cursorStartedAt = '2026-05-27T10:00:00.000Z';

      const cursor = Buffer.from(
        JSON.stringify({
          startedAt: cursorStartedAt,
          id: cursorId.toString(),
        }),
        'utf8',
      ).toString('base64url');

      const execFind = jest.fn().mockResolvedValue([]);
      const limit = jest.fn().mockReturnValue({ exec: execFind });
      const sort = jest.fn().mockReturnValue({ limit });

      callLogModel.find.mockReturnValue({ sort });

      await service.get({
        userId,
        peerUserId,
        limit: 10,
        status: 'completed',
        type: 'audio',
        direction: 'outgoing',
        cursor,
      });

      expect(callLogModel.find).toHaveBeenCalledWith({
        $and: [
          {
            userId: new Types.ObjectId(userId),
          },
          {
            peerUserId: new Types.ObjectId(peerUserId),
          },
          {
            status: 'completed',
          },
          {
            type: 'audio',
          },
          {
            direction: 'outgoing',
          },
          {
            $or: [
              {
                startedAt: {
                  $lt: new Date(cursorStartedAt),
                },
              },
              {
                startedAt: new Date(cursorStartedAt),
                _id: {
                  $lt: new Types.ObjectId(cursorId.toString()),
                },
              },
            ],
          },
        ],
      });

      expect(limit).toHaveBeenCalledWith(11);
    });

    it('should throw BadRequestException for invalid cursor json', async () => {
      const userId = new Types.ObjectId().toString();

      await expect(
        service.get({
          userId,
          limit: 50,
          cursor: 'invalid-cursor',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(callLogModel.find).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for cursor without valid object id', async () => {
      const userId = new Types.ObjectId().toString();

      const cursor = Buffer.from(
        JSON.stringify({
          startedAt: '2026-05-27T10:00:00.000Z',
          id: 'invalid-id',
        }),
        'utf8',
      ).toString('base64url');

      await expect(
        service.get({
          userId,
          limit: 50,
          cursor,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(callLogModel.find).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for cursor without valid startedAt', async () => {
      const userId = new Types.ObjectId().toString();

      const cursor = Buffer.from(
        JSON.stringify({
          startedAt: 'invalid-date',
          id: new Types.ObjectId().toString(),
        }),
        'utf8',
      ).toString('base64url');

      await expect(
        service.get({
          userId,
          limit: 50,
          cursor,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(callLogModel.find).not.toHaveBeenCalled();
    });
  });

  describe('createCallLog', () => {
    it('should create completed call log with durations', async () => {
      const userId = new Types.ObjectId().toString();
      const peerUserId = new Types.ObjectId().toString();

      const startedAt = new Date('2026-05-27T10:00:00.000Z');
      const answeredAt = new Date('2026-05-27T10:00:05.000Z');
      const endedAt = new Date('2026-05-27T10:10:00.000Z');

      callLogModel.create.mockResolvedValue({});

      await service.createCallLog({
        callId: 'call-1',
        userId,
        peerUserId,
        peerUserName: 'Ivan the Terrible',
        startedAt,
        answeredAt,
        endedAt,
        direction: 'outgoing',
        type: 'video',
        status: 'completed',
      });

      expect(callLogModel.create).toHaveBeenCalledWith({
        callId: 'call-1',
        userId: new Types.ObjectId(userId),
        peerUserId: new Types.ObjectId(peerUserId),
        peerUserName: 'Ivan the Terrible',
        startedAt,
        answeredAt,
        endedAt,
        direction: 'outgoing',
        type: 'video',
        status: 'completed',
        durationSeconds: 595,
        ringingDurationSeconds: 5,
      });
    });

    it('should create missed call log without durationSeconds', async () => {
      const userId = new Types.ObjectId().toString();
      const peerUserId = new Types.ObjectId().toString();

      const startedAt = new Date('2026-05-27T10:00:00.000Z');
      const endedAt = new Date('2026-05-27T10:02:00.000Z');

      callLogModel.create.mockResolvedValue({});

      await service.createCallLog({
        callId: 'call-1',
        userId,
        peerUserId,
        startedAt,
        endedAt,
        direction: 'incoming',
        type: 'audio',
        status: 'missed',
      });

      expect(callLogModel.create).toHaveBeenCalledWith({
        callId: 'call-1',
        userId: new Types.ObjectId(userId),
        peerUserId: new Types.ObjectId(peerUserId),
        peerUserName: undefined,
        startedAt,
        answeredAt: undefined,
        endedAt,
        direction: 'incoming',
        type: 'audio',
        status: 'missed',
        durationSeconds: undefined,
        ringingDurationSeconds: 120,
      });
    });

    it('should not create negative durations', async () => {
      const userId = new Types.ObjectId().toString();
      const peerUserId = new Types.ObjectId().toString();

      const startedAt = new Date('2026-05-27T10:00:10.000Z');
      const answeredAt = new Date('2026-05-27T10:00:05.000Z');
      const endedAt = new Date('2026-05-27T10:00:00.000Z');

      callLogModel.create.mockResolvedValue({});

      await service.createCallLog({
        callId: 'call-1',
        userId,
        peerUserId,
        startedAt,
        answeredAt,
        endedAt,
        direction: 'outgoing',
        type: 'audio',
        status: 'failed',
      });

      expect(callLogModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          durationSeconds: 0,
          ringingDurationSeconds: 0,
        }),
      );
    });
  });
});
