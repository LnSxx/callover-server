import { CallType } from '../../entities/call';
import { SignalingEventTypes } from './signaling.events';

export type CallOfferEvent = {
  type: SignalingEventTypes.CallOffer;
  payload: CallOfferEventPayload;
};

export type CallOfferEventPayload = {
  fromUserId: string;
  sdp: string;
  type: CallType;
};

export type CallAnswerEvent = {
  type: SignalingEventTypes.CallAnswer;
  payload: CallAnswerEventPayload;
};

export type CallAnswerEventPayload = {
  fromUserId: string;
  sdp: string;
};

export type CallDeclineEvent = {
  type: SignalingEventTypes.CallDecline;
  payload: CallDeclineEventPayload;
};

export type CallDeclineEventPayload = {
  fromUserId: string;
};

export type CallCancelEvent = {
  type: SignalingEventTypes.CallCancel;
  payload: CallCancelEventPayload;
};

export type CallCancelEventPayload = {
  fromUserId: string;
};

export type CallEndEvent = {
  type: SignalingEventTypes.CallEnd;
  payload: CallEndEventPayload;
};

export type CallEndEventPayload = {
  fromUserId: string;
};

export type CallTimeoutEvent = {
  type: SignalingEventTypes.CallTimeout;
  payload: CallTimeoutEventPayload;
};

export type CallTimeoutEventPayload = {
  roomId: string;
  reason: 'no_answer' | 'max_duration';
};

export type CallIceCandidateEvent = {
  type: SignalingEventTypes.CallIceCandidate;
  payload: CallIceCandidateEventPayload;
};

export type CallIceCandidateEventPayload = {
  fromUserId: string;
  sdp: string;
  sdpMLineIndex: number;
  sdpMid?: string;
};
