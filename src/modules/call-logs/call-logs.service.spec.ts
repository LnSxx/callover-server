/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Types } from 'mongoose';
import { CallLogsService } from './call-logs.service';

describe('CallLogsService', () => {
  let service: CallLogsService;

  let callLogModel: {
    find: jest.Mock;
    countDocuments: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(() => {
    callLogModel = {
      find: jest.fn(),
      countDocuments: jest.fn(),
      create: jest.fn(),
    };

    service = new CallLogsService(callLogModel as any);
  });

  describe('get', () => {
    it('should return call logs with pagination data', async () => {
      const userId = new Types.ObjectId().toString();

      const callLogs = [
        {
          callId: 'call-1',
          userId: new Types.ObjectId(userId),
          peerUserId: new Types.ObjectId(),
          status: 'completed',
        },
      ];

      const execFind = jest.fn().mockResolvedValue(callLogs);
      const execCount = jest.fn().mockResolvedValue(10);

      const limit = jest.fn().mockReturnValue({ exec: execFind });
      const skip = jest.fn().mockReturnValue({ limit });
      const sort = jest.fn().mockReturnValue({ skip });

      callLogModel.find.mockReturnValue({ sort });
      callLogModel.countDocuments.mockReturnValue({ exec: execCount });

      const result = await service.get({
        userId,
        limit: 50,
        offset: 0,
      });

      expect(callLogModel.find).toHaveBeenCalledWith({
        userId: new Types.ObjectId(userId),
      });

      expect(sort).toHaveBeenCalledWith({ startedAt: -1 });
      expect(skip).toHaveBeenCalledWith(0);
      expect(limit).toHaveBeenCalledWith(50);

      expect(callLogModel.countDocuments).toHaveBeenCalledWith({
        userId: new Types.ObjectId(userId),
      });

      expect(result).toEqual({
        data: callLogs,
        limit: 50,
        offset: 0,
        count: 1,
        total: 10,
      });
    });

    it('should apply all filters', async () => {
      const userId = new Types.ObjectId().toString();
      const peerUserId = new Types.ObjectId().toString();
      const startedAfter = new Date('2026-05-01T00:00:00.000Z');
      const startedBefore = new Date('2026-05-31T23:59:59.000Z');

      const execFind = jest.fn().mockResolvedValue([]);
      const execCount = jest.fn().mockResolvedValue(0);

      const limit = jest.fn().mockReturnValue({ exec: execFind });
      const skip = jest.fn().mockReturnValue({ limit });
      const sort = jest.fn().mockReturnValue({ skip });

      callLogModel.find.mockReturnValue({ sort });
      callLogModel.countDocuments.mockReturnValue({ exec: execCount });

      await service.get({
        userId,
        peerUserId,
        limit: 20,
        offset: 10,
        status: 'missed',
        type: 'video',
        direction: 'incoming',
        startedAfter,
        startedBefore,
      });

      const expectedFilter = {
        userId: new Types.ObjectId(userId),
        peerUserId: new Types.ObjectId(peerUserId),
        status: 'missed',
        type: 'video',
        direction: 'incoming',
        startedAt: {
          $gte: startedAfter,
          $lte: startedBefore,
        },
      };

      expect(callLogModel.find).toHaveBeenCalledWith(expectedFilter);
      expect(callLogModel.countDocuments).toHaveBeenCalledWith(expectedFilter);
      expect(skip).toHaveBeenCalledWith(10);
      expect(limit).toHaveBeenCalledWith(20);
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
