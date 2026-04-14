import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { SessionsService } from '../sessions/sessions.service';
import { extractSignedSessionId } from '../realtime/realtime.utils';

@Injectable()
export class PresenceService {
  constructor(private readonly sessionsService: SessionsService) {}

  // userId -> set of socketIds
  private readonly userToSockets: Map<string, Set<string>> = new Map();
  // socketId -> userId
  private readonly socketToUser: Map<string, string> = new Map();

  /// Method to handle new socket connections and update the presence state
  async handleConnection(
    userId: string,
    client: Socket,
  ): Promise<{
    userId: string | null;
    becameOnline: boolean;
  }> {
    // In case no user is associated with the socket connection
    if (!userId)
      return {
        userId: null,
        becameOnline: false,
      };

    // Update the presence state by adding the socket to the user's set of active sockets
    if (!this.userToSockets.has(userId)) {
      this.userToSockets.set(userId, new Set());
    }

    // Add the socket id to the user's set of active sockets and update the socket-to-user mapping
    this.userToSockets.get(userId)!.add(client.id);
    this.socketToUser.set(client.id, userId);
    return {
      userId,
      becameOnline: true,
    };
  }

  /// Method to handle socket disconnection and clean up the mappings
  handleDisconnect(client: Socket): {
    userId: string | null;
    becameOffline: boolean;
  } {
    // This should never happen
    const userId = this.socketToUser.get(client.id);
    if (!userId) {
      return {
        userId: null,
        becameOffline: false,
      };
    }

    // Clean up the mappings
    // Remove the socket from the user's set of sockets
    this.socketToUser.delete(client.id);

    // If the user has no more active sockets, remove them from the userToSockets map
    const sockets = this.userToSockets.get(userId);
    // This should never happen
    if (!sockets) {
      return {
        userId,
        becameOffline: false,
      };
    }

    // Remove the socket from the user's set of sockets
    sockets.delete(client.id);

    // In case the user has no more active sockets, remove them from the userToSockets map
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

  getSocketsForUser(userId: string): Set<string> {
    return this.userToSockets.get(userId) ?? new Set();
  }
}
