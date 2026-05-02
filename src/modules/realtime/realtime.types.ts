import { Socket } from 'socket.io';
import { RealtimeEventTypes } from './realtime.events';

export type AuthedSocket = Socket & {
  data: {
    user?: {
      id: string;
    };
  };
};

export type PresenceInitialEvent = {
  type: RealtimeEventTypes.PresenceInitial;
  payload: PresenceInitialEventPayload;
};

export type PresenceInitialEventPayload = {
  onlineUserIds: string[];
};

export type PresenceUserOnlineEvent = {
  type: RealtimeEventTypes.PresenceUserOnline;
  payload: PresenceUserOnlineEventPayload;
};

export type PresenceUserOnlineEventPayload = {
  userId: string;
};

export type PresenceUserOfflineEvent = {
  type: RealtimeEventTypes.PresenceUserOffline;
  payload: PresenceUserOfflineEventPayload;
};

export type PresenceUserOfflineEventPayload = {
  userId: string;
};
