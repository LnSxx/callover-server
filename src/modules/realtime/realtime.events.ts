export enum RealtimeEvents {
  // PRESENCE EVENTS
  // This events provides real-time updates about the online/offline status of users in the system.
  // Clients can subscribe to these events to know when their contacts come online or go offline.

  // Client -> Server
  // Client sends this message to subscribe to presence (online/offline) updates of other users
  PresenceSubscribe = 'presence.subscribe',

  // Client -> Server
  // Client sends this message to unsubscribe from presence updates
  PresenceUnsubscribe = 'presence.unsubscribe',

  // Server -> Client
  // Server sends this message to the client after they subscribe to presence updates, containing the list of currently online users
  PresenceInitial = 'presence.initial',

  // Server -> Client
  // Server sends this message to the client when a user comes online
  PresenceUserOnline = 'presence.user.online',

  // Server -> Client
  // Server sends this message to the client when a user goes offline
  PresenceUserOffline = 'presence.user.offline',
}

export type PresenceInitialEvent = {
  type: RealtimeEvents.PresenceInitial;
  payload: PresenceInitialEventPayload;
};

export type PresenceUserOnlineEvent = {
  type: RealtimeEvents.PresenceUserOnline;
  payload: PresenceUserOnlineEventPayload;
};

export type PresenceUserOfflineEvent = {
  type: RealtimeEvents.PresenceUserOffline;
  payload: PresenceUserOfflineEventPayload;
};

export type PresenceInitialEventPayload = {
  onlineUserIds: string[];
};

export type PresenceUserOnlineEventPayload = {
  userId: string;
};

export type PresenceUserOfflineEventPayload = {
  userId: string;
};
