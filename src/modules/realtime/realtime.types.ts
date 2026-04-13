import { Socket } from 'socket.io';

export type AuthedSocket = Socket & {
  data: {
    user?: {
      id: string;
    };
  };
};

export type PresenceInitialEvent = {
  onlineUserIds: string[];
};

export type PresenceUserOnlineEvent = {
  userId: string;
};

export type PresenceUserOfflineEvent = {
  userId: string;
};
