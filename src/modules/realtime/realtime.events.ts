import { CallType } from '../calls/calls.types';

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

  // Bidirectional (Client <-> Server)
  // Client sends this message to initiate a call to another user
  // including the target user's ID and the Session Description Protocol (SDP) offer and call type (audio/video)
  // Server sends this message to the callee client when they receive a call offer from another user
  // including the caller's user ID and the SDP offer and call type (audio/video)
  CallOffer = 'call.offer',

  // Bidirectional (Client <-> Server)
  // Client sends this message to answer an incoming call offer, including the target user's ID and the SDP answer (or null if rejecting the call)
  // Server sends this message to the caller client when the callee answers the call offer, including the callee's user ID and the SDP answer (or null if rejecting the call)
  CallAnswer = 'call.answer',

  // Bidirectional (Client <-> Server)
  // Client sends this message to cancel an outgoing call offer before it's answered by the callee
  // Server sends this message to the callee client when the caller cancels the call offer
  CallCancel = 'call.cancel',

  // Bidirectional (Client <-> Server)
  // Caller and callee clients exchange this message to share ICE candidates for establishing the WebRTC peer-to-peer connection
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

// CALL EVENTS

// Outgoing for client call offer
// Caller client -> Server
// Caller sends this message to the server to initiate a call
// including the target user's ID and the Session Description Protocol (SDP) offer and call type (audio/video)
export type CallOfferOutgoingEvent = {
  type: RealtimeEvents.CallOffer;
  payload: CallOfferOutgoingEventPayload;
};

export type CallOfferOutgoingEventPayload = {
  toUserId: string;
  sdp: string;
  type: CallType;
};

// Incoming for client call offer
// Server -> Callee client
// Server sends this message to the callee client when they receive a call offer from another user
// including the caller's user ID and the SDP offer and call type (audio/video)
export type CallOfferIncomingEvent = {
  type: RealtimeEvents.CallOffer;
  payload: CallOfferIncomingEventPayload;
};

export type CallOfferIncomingEventPayload = {
  fromUserId: string;
  sdp: string;
  type: CallType;
};

// Outgoing for client call answer
// Callee client -> Server
// Callee sends this message to the server to answer an incoming call offer,
// including the target user's ID and the SDP answer (or null if rejecting the call)
export type CallAnswerOutgoingEvent = {
  type: RealtimeEvents.CallAnswer;
  payload: CallAnswerOutgoingEventPayload;
};

export type CallAnswerOutgoingEventPayload = {
  toUserId: string;
  sdp?: string | null;
};

// Incoming for client call answer
// Server -> Caller client
// Server sends this message to the caller client when the callee answers the call offer,
// including the callee's user ID and the SDP answer (or null if rejecting the call)
export type CallAnswerIncomingEvent = {
  type: RealtimeEvents.CallAnswer;
  payload: CallAnswerIncomingEventPayload;
};

export type CallAnswerIncomingEventPayload = {
  fromUserId: string;
  sdp?: string | null;
};

// Outgoing for client call cancel
// Caller client -> Server
// Caller sends this message to the server to cancel an outgoing call offer before it's answered by the callee
export type CallCancelOutgoingEvent = {
  type: RealtimeEvents.CallCancel;
  payload: CallCancelOutgoingEventPayload;
};

// Payload includes the target user's ID
export type CallCancelOutgoingEventPayload = {
  toUserId: string;
};

// Incoming for client call cancel
// Server -> Callee client
// Server sends this message to the callee client when the caller cancels the call offer
export type CallCancelIncomingEvent = {
  type: RealtimeEvents.CallCancel;
  payload: CallCancelIncomingEventPayload;
};

// Payload includes the caller's user ID
export type CallCancelIncomingEventPayload = {
  fromUserId: string;
};

// Bidirectional (Client <-> Server)
// Caller and callee clients exchange this message
// to share ICE candidates for establishing the WebRTC peer-to-peer connection
export type CallIceCandidateEvent = {
  type: RealtimeEvents.CallIceCandidate;
  payload: CallIceCandidateEventPayload;
};

// Payload includes the target user's ID and the ICE candidate strings
export type CallIceCandidateEventPayload = {
  toUserId: string;
  candidate: string;
};
