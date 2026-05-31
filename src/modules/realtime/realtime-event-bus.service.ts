import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

@Injectable()
export class RealtimeEventBusService {
  private server?: Server;

  setServer(server: Server): void {
    this.server = server;
  }

  emitToSocket(socketId: string, event: unknown): void {
    this.server?.to(socketId).emit('message', event);
  }

  emitToSockets(socketIds: string[], event: unknown): void {
    for (const socketId of socketIds) {
      this.emitToSocket(socketId, event);
    }
  }

  emitToRoom(roomId: string, event: unknown): void {
    this.server?.to(roomId).emit('message', event);
  }
}
