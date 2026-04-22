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
  // Client sends this message to end an active call
  // Server sends this message to other hand client
  CallEnd = 'call.end',

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
// including the target user's ID and the Session Description Protocol (SDP)
// offer and call type (audio/video)
export type CallOfferEvent = {
  type: RealtimeEvents.CallOffer;
  payload: CallOfferEventPayload;
};

export type CallOfferEventPayload = {
  toUserId: string;
  sdp: string;
  type: CallType;
};

// Incoming for client call offer
// Server -> Callee client
// Server sends this message to the callee client when they receive a call offer from another user
// including the caller's user ID and the SDP offer and call type (audio/video)
export type CallOfferRelayEvent = {
  type: RealtimeEvents.CallOffer;
  payload: CallOfferRelayEventPayload;
};

export type CallOfferRelayEventPayload = {
  fromUserId: string;
  sdp: string;
  type: CallType;
};

// Outgoing for client call answer
// Callee client -> Server
// Callee sends this message to the server to answer an incoming call offer,
// including the target user's ID and the SDP answer (or null if rejecting the call)
export type CallAnswerEvent = {
  type: RealtimeEvents.CallAnswer;
  payload: CallAnswerEventPayload;
};

export type CallAnswerEventPayload = {
  toUserId: string;
  sdp?: string | null;
};

// Incoming for client call answer
// Server -> Caller client
// Server sends this message to the caller client when the callee answers the call offer,
// including the callee's user ID and the SDP answer (or null if rejecting the call)
export type CallAnswerRelayEvent = {
  type: RealtimeEvents.CallAnswer;
  payload: CallAnswerRelayEventPayload;
};

export type CallAnswerRelayEventPayload = {
  fromUserId: string;
  sdp?: string | null;
};

// Outgoing for client call cancel
// Caller client -> Server
// Caller sends this message to the server to cancel an outgoing call offer before it's answered by the callee
export type CallCancelEvent = {
  type: RealtimeEvents.CallCancel;
  payload: CallCancelEventPayload;
};

// Payload includes the target user's ID
export type CallCancelEventPayload = {
  toUserId: string;
};

// Incoming for client call cancel
// Server -> Callee client
// Server sends this message to the callee client when the caller cancels the call offer
export type CallCancelRelayEvent = {
  type: RealtimeEvents.CallCancel;
  payload: CallCancelRelayEventPayload;
};

// Payload includes the caller's user ID
export type CallCancelRelayEventPayload = {
  fromUserId: string;
};

export type CallEndEvent = {
  type: RealtimeEvents.CallEnd;
  payload: CallCancelEventPayload;
};

export type CallEndEventPayload = {
  toUserId: string;
};

export type CallEndRelayEvent = {
  type: RealtimeEvents.CallEnd;
  payload: CallEndRelayEventPayload;
};

// Payload includes the caller's user ID
export type CallEndRelayEventPayload = {
  fromUserId: string;
};

// Outgoing for client ICE Candidate message
// Caller or callee client sends this message
// to share ICE candidates for establishing the WebRTC peer-to-peer connection
export type CallIceCandidateEvent = {
  type: RealtimeEvents.CallIceCandidate;
  payload: CallIceCandidateEventPayload;
};

// Payload includes the target user's ID and the ICE candidate string
export type CallIceCandidateEventPayload = {
  toUserId: string;
  candidate: string;
};

// Incoming for client ICE Candidate message
// Server sends ICE candidates to target receiver
export type CallIceCandidateRelayEvent = {
  type: RealtimeEvents.CallIceCandidate;
  payload: CallIceCandidateEventRelayPayload;
};

// Payload includes the origin user's ID and the ICE candidate string
export type CallIceCandidateEventRelayPayload = {
  fromUserId: string;
  candidate: string;
};
