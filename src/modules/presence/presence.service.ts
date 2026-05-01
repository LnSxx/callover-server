import { Injectable } from '@nestjs/common';

@Injectable()
export class PresenceService {
  private readonly userToSockets: Map<string, Set<string>> = new Map();
  private readonly socketToUser: Map<string, string> = new Map();

  markSocketOnline(userId: string, socketId: string): void {
    const hasRegisteredSocket = this.socketToUser.has(socketId);

    if (hasRegisteredSocket) {
      return;
    }

    const sockets = this.userToSockets.get(userId) ?? new Set<string>();
    sockets.add(socketId);

    this.userToSockets.set(userId, sockets);
    this.socketToUser.set(socketId, userId);
  }

  markSocketOffline({ socketId }: { socketId: string }): {
    userId: string | null;
    becameOffline: boolean;
  } {
    const userId = this.socketToUser.get(socketId);

    if (!userId) {
      return {
        userId: null,
        becameOffline: false,
      };
    }

    this.socketToUser.delete(socketId);
    const sockets = this.userToSockets.get(userId);

    if (!sockets) {
      return {
        userId,
        becameOffline: false,
      };
    }

    sockets.delete(socketId);

    if (sockets.size === 0) {
      this.userToSockets.delete(userId);
      return {
        userId,
        becameOffline: true,
      };
    }

    return {
      userId,
      becameOffline: false,
    };
  }

  isUserOnline(userId: string): boolean {
    return (this.userToSockets.get(userId)?.size ?? 0) > 0;
  }

  getOnlineUserIds(): string[] {
    return [...this.userToSockets.keys()];
  }

  getSocketIdsForUser(userId: string): string[] {
    return [...(this.userToSockets.get(userId) ?? [])];
  }
}
