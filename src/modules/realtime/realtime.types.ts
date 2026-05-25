import { Socket } from 'socket.io';
import {
  PresenceInitialEvent,
  PresenceUserOfflineEvent,
  PresenceUserOnlineEvent,
} from '../presence/presence.types';
import { PresenceSubscribeDto } from './dto/presence.subscribe.dto';
import {
  CallAnswerEvent,
  CallCancelEvent,
  CallDeclineEvent,
  CallEndEvent,
  CallIceCandidateEvent,
  CallOfferEvent,
} from '../signaling/signaling.types';
import { CallOfferMessageDto } from '../signaling/dto/call-offer.message.dto';
import { CallAnswerMessageDto } from '../signaling/dto/call-answer.message.dto';
import { CallDeclineMessageDto } from '../signaling/dto/call-decline.message.dto';
import { CallCancelMessageDto } from '../signaling/dto/call-cancel.message.dto';
import { CallEndMessageDto } from '../signaling/dto/call-end.message.dto';
import { CallIceCandidateMessageDto } from '../signaling/dto/call-ice-candidate.message.dto';

export type SocketData = {
  user?: {
    id: string;
  };
  presenceRefreshInterval?: NodeJS.Timeout;
};

export type ServerToClientEvents = {
  message: (event: RealtimeEvent) => void;
};

export type ClientToServerEvents = {
  'presence.subscribe': (body: PresenceSubscribeDto) => void;
  'call.offer': (body: CallOfferMessageDto) => void;
  'call.answer': (body: CallAnswerMessageDto) => void;
  'call.decline': (body: CallDeclineMessageDto) => void;
  'call.cancel': (body: CallCancelMessageDto) => void;
  'call.end': (body: CallEndMessageDto) => void;
  'call.ice-candidate': (body: CallIceCandidateMessageDto) => void;
};

export type InterServerEvents = Record<string, never>;

export type AuthedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type RealtimeEvent =
  | PresenceInitialEvent
  | PresenceUserOnlineEvent
  | PresenceUserOfflineEvent
  | CallOfferEvent
  | CallAnswerEvent
  | CallDeclineEvent
  | CallCancelEvent
  | CallEndEvent
  | CallIceCandidateEvent;
