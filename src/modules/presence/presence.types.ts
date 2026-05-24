import { PresenceEventTypes } from './presence.events';

export type PresenceInitialEvent = {
  type: PresenceEventTypes.PresenceInitial;
  payload: PresenceInitialEventPayload;
};

export type PresenceInitialEventPayload = {
  onlineUserIds: string[];
};

export type PresenceUserOnlineEvent = {
  type: PresenceEventTypes.PresenceUserOnline;
  payload: PresenceUserOnlineEventPayload;
};

export type PresenceUserOnlineEventPayload = {
  userId: string;
};

export type PresenceUserOfflineEvent = {
  type: PresenceEventTypes.PresenceUserOffline;
  payload: PresenceUserOfflineEventPayload;
};

export type PresenceUserOfflineEventPayload = {
  userId: string;
};
