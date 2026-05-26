/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationModel: {
    find: jest.Mock;
    countDocuments: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
  };

  beforeEach(() => {
    notificationModel = {
      find: jest.fn(),
      countDocuments: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    };

    service = new NotificationsService(notificationModel as any);
  });

  describe('get', () => {
    it('should return notifications with pagination data', async () => {
      const notifications = [
        {
          _id: 'notification-1',
          userId: 'user-1',
          status: 'unread',
          createdAt: new Date(),
        },
      ];

      const execFind = jest.fn().mockResolvedValue(notifications);
      const execCount = jest.fn().mockResolvedValue(10);

      const limit = jest.fn().mockReturnValue({ exec: execFind });
      const skip = jest.fn().mockReturnValue({ limit });
      const sort = jest.fn().mockReturnValue({ skip });

      notificationModel.find.mockReturnValue({ sort });
      notificationModel.countDocuments.mockReturnValue({ exec: execCount });

      const result = await service.get({
        userId: 'user-1',
        limit: 50,
        offset: 0,
      });

      expect(notificationModel.find).toHaveBeenCalledWith({
        userId: 'user-1',
      });
      expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(skip).toHaveBeenCalledWith(0);
      expect(limit).toHaveBeenCalledWith(50);

      expect(notificationModel.countDocuments).toHaveBeenCalledWith({
        userId: 'user-1',
      });

      expect(result).toEqual({
        data: notifications,
        limit: 50,
        offset: 0,
        count: 1,
        total: 10,
      });
    });

    it('should apply status filter', async () => {
      const execFind = jest.fn().mockResolvedValue([]);
      const execCount = jest.fn().mockResolvedValue(0);

      const limit = jest.fn().mockReturnValue({ exec: execFind });
      const skip = jest.fn().mockReturnValue({ limit });
      const sort = jest.fn().mockReturnValue({ skip });

      notificationModel.find.mockReturnValue({ sort });
      notificationModel.countDocuments.mockReturnValue({ exec: execCount });

      await service.get({
        userId: 'user-1',
        limit: 20,
        offset: 10,
        status: 'read',
      });

      expect(notificationModel.find).toHaveBeenCalledWith({
        userId: 'user-1',
        status: 'read',
      });

      expect(notificationModel.countDocuments).toHaveBeenCalledWith({
        userId: 'user-1',
        status: 'read',
      });
    });
  });

  describe('createMissedCallNotification', () => {
    it('should create missed call notification', async () => {
      notificationModel.create.mockResolvedValue({});

      await service.createMissedCallNotification({
        userId: 'user-2',
        callId: 'call-1',
        fromUserId: 'user-1',
        fromUserName: 'Leonid',
        callType: 'video',
      });

      expect(notificationModel.create).toHaveBeenCalledWith({
        userId: 'user-2',
        type: 'missed_call',
        status: 'unread',
        title: 'Missed video call',
        body: 'Missed video call from Leonid',
        call: {
          callId: 'call-1',
          fromUserId: 'user-1',
          fromUserName: 'Leonid',
          callType: 'video',
        },
        expiresAt: expect.any(Date),
      });
    });

    it('should create missed call notification without body if name is missing', async () => {
      notificationModel.create.mockResolvedValue({});

      await service.createMissedCallNotification({
        userId: 'user-2',
        callId: 'call-1',
        fromUserId: 'user-1',
        callType: 'audio',
      });

      expect(notificationModel.create).toHaveBeenCalledWith({
        userId: 'user-2',
        type: 'missed_call',
        status: 'unread',
        title: 'Missed audio call',
        body: undefined,
        call: {
          callId: 'call-1',
          fromUserId: 'user-1',
          fromUserName: undefined,
          callType: 'audio',
        },
        expiresAt: expect.any(Date),
      });
    });
  });

  describe('createMutedCallNotification', () => {
    it('should create muted call notification', async () => {
      notificationModel.create.mockResolvedValue({});

      await service.createMutedCallNotification({
        userId: 'user-2',
        callId: 'call-1',
        fromUserId: 'user-1',
        fromUserName: 'Leonid',
        callType: 'audio',
      });

      expect(notificationModel.create).toHaveBeenCalledWith({
        userId: 'user-2',
        type: 'muted_call',
        status: 'unread',
        title: 'Muted audio call',
        body: 'Muted audio call from Leonid',
        call: {
          callId: 'call-1',
          fromUserId: 'user-1',
          fromUserName: 'Leonid',
          callType: 'audio',
        },
        expiresAt: expect.any(Date),
      });
    });
  });

  describe('createServiceNotification', () => {
    it('should create service notification with default expiresAt', async () => {
      notificationModel.create.mockResolvedValue({});

      await service.createServiceNotification({
        userId: 'user-1',
        title: 'Service message',
        body: 'Body',
        code: 'service_code',
        payload: {
          key: 'value',
        },
      });

      expect(notificationModel.create).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'service_message',
        status: 'unread',
        title: 'Service message',
        body: 'Body',
        service: {
          code: 'service_code',
          payload: {
            key: 'value',
          },
        },
        expiresAt: expect.any(Date),
      });
    });

    it('should create service notification with custom expiresAt', async () => {
      notificationModel.create.mockResolvedValue({});

      const expiresAt = new Date('2026-04-29T10:00:00.000Z');

      await service.createServiceNotification({
        userId: 'user-1',
        title: 'Service message',
        expiresAt,
      });

      expect(notificationModel.create).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'service_message',
        status: 'unread',
        title: 'Service message',
        body: undefined,
        service: {
          code: undefined,
          payload: undefined,
        },
        expiresAt,
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notifications as read for current user only', async () => {
      notificationModel.updateMany.mockResolvedValue({});

      await service.markAsRead('user-1', ['notification-1', 'notification-2']);

      expect(notificationModel.updateMany).toHaveBeenCalledWith(
        {
          _id: {
            $in: ['notification-1', 'notification-2'],
          },
          userId: 'user-1',
        },
        {
          status: 'read',
          readAt: expect.any(Date),
        },
      );
    });
  });
});
