import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class PresenceService {
  private connectedUsers: Map<string, Set<Socket>> = new Map();

  addConnection(userId: string, socket: Socket) {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }

    this.connectedUsers.get(userId)!.add(socket);
  }

  removeConnection(userId: string, socket: Socket) {
    const sockets = this.connectedUsers.get(userId);

    if (!sockets) return;

    sockets.delete(socket);

    if (sockets.size === 0) {
      this.connectedUsers.delete(userId);
    }
  }

  isOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  getUserSockets(userId: string): Socket[] {
    return Array.from(this.connectedUsers.get(userId) || []);
  }

  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }
}
