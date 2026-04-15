import { Socket } from 'socket.io';
import { RealtimeEvents } from './realtime.events';

export type AuthedSocket = Socket & {
  data: {
    user?: {
      id: string;
    };
  };
};
