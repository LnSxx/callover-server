import { Socket } from 'socket.io';

export type AuthedSocket = Socket & {
  data: {
    user?: {
      id: string;
    };
  };
};
