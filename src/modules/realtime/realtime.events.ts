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

  // CALL EVENTS
  // These events are used for managing real-time communication (calls) between users.
  // They include events for initiating calls, answering calls, canceling calls, declining calls, and exchanging ICE candidates for WebRTC connections.

  // Client -> Server
  // Client sends this message to initiate a call to another user
  // including the target user's ID and the Session Description Protocol (SDP) offer
  CallOffer = 'call.offer',

  // Client -> Server
  // Client sends this message to answer an incoming call, including the target user's ID and the SDP answer (or null if declining)
  CallAnswer = 'call.answer',

  // Client -> Server
  // Client sends this message to cancel an outgoing call before it's answered
  CallCancel = 'call.cancel',

  // Server -> Client
  // Server sends this message to the caller when the callee declines the call
  CallDecline = 'call.decline',

  // Client -> Server
  // Client sends this message to exchange ICE candidates with the other user during the WebRTC connection setup
  CallIceCandidate = 'call.ice-candidate',
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

export type CallOfferEvent = {
  type: RealtimeEvents.CallOffer;
  payload: CallOfferEventPayload;
};

export type CallAnswerEvent = {
  type: RealtimeEvents.CallAnswer;
  payload: CallAnswerEventPayload;
};

export type CallCancelEvent = {
  type: RealtimeEvents.CallCancel;
  payload: CallCancelEventPayload;
};

export type CallDeclineEvent = {
  type: RealtimeEvents.CallDecline;
  payload: CallDeclineEventPayload;
};

export type CallIceCandidateEvent = {
  type: RealtimeEvents.CallIceCandidate;
  payload: CallIceCandidateEventPayload;
};

export type CallOfferEventPayload = {
  toUserId: string;
  sdp: string;
};

export type CallAnswerEventPayload = {
  toUserId: string;
  // If Session Description Protocol (SDP) is null, it means the call was rejected by the callee
  sdp?: string | null;
};

export type CallCancelEventPayload = {
  toUserId: string;
};

export type CallDeclineEventPayload = {
  toUserId: string;
};

export type CallIceCandidateEventPayload = {
  toUserId: string;
  candidate: string;
};
