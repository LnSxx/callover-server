import { CallType } from '../calls/calls.types';
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
  sdp?: string | null;
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

export type CallIceCandidateEvent = {
  type: SignalingEventTypes.CallIceCandidate;
  payload: CallIceCandidateEventPayload;
};

export type CallIceCandidateEventPayload = {
  fromUserId: string;
  candidate: string;
};
