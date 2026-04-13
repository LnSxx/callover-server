import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server } from 'socket.io';
import type {
  AuthedSocket,
  PresenceInitialEvent,
  PresenceUserOfflineEvent,
  PresenceUserOnlineEvent,
} from './realtime.types';
import { RealtimeAuthGuard } from './realtime.guard';
import { Socket } from 'socket.io';
import { extractSignedSessionId } from './realtime.utils';
import { PresenceService } from '../presence/presence.service';
import { SessionsService } from '../sessions/sessions.service';
import { PresenceSubscriptionsService } from '../presenceSubsciptions/presenceSubscriptions.service';
import { PresenceSubscribeDto } from './dto/presence.subscribe.dto';
import { RealtimeEvents } from './realtime.events';

@WebSocketGateway({
  namespace: 'events',
  transports: ['websocket'],
  cors: {
    origin: ['http://localhost:5173'],
    credentials: true,
  },
})
@UseGuards(RealtimeAuthGuard)
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly presenceService: PresenceService,
    private readonly presenceSubscriptionsService: PresenceSubscriptionsService,
    private readonly sessionsService: SessionsService,
  ) {}

  @WebSocketServer()
  server: Server;

  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new WsException(errors),
    }),
  )
  @SubscribeMessage('presence.subscribe')
  handleMessage(
    @MessageBody() body: PresenceSubscribeDto,
    @ConnectedSocket() client: AuthedSocket,
  ) {
    const userId = client.data.user?.id;
    if (!userId) {
      client.disconnect();
      return;
    }

    // Subscribe the user to presence updates for the specified contacts
    this.presenceSubscriptionsService.subscribe(userId, body.userIds);

    // Get the initial presence state for the subscribed contacts and send it back to the client
    const onlineUsers = body.userIds.filter((id) =>
      this.presenceService.isUserOnline(id),
    );

    client.emit(RealtimeEvents.PresenceInitial, {
      onlineUserIds: onlineUsers,
    } as PresenceInitialEvent);
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    const userId = await this.extractUserId(client);

    if (!userId) {
      client.disconnect();
      return;
    }

    const result = await this.presenceService.handleConnection(userId, client);

    if (result.becameOnline) {
      // Notify all subscribers that the user has come online
      const watchers = this.presenceSubscriptionsService.getWatchers(userId);
      for (const watcherId of watchers) {
        this.server.to(watcherId).emit(RealtimeEvents.PresenceUserOnline, {
          userId: result.userId,
        } as PresenceUserOnlineEvent);
      }
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    const userId = client.data.user?.id;
    if (userId) {
      this.presenceSubscriptionsService.unsubscribe(userId);
    }
    const result = this.presenceService.handleDisconnect(client);
    if (result.becameOffline && result.userId) {
      // Notify all subscribers that the user has gone offline
      const watchers = this.presenceSubscriptionsService.getWatchers(
        result.userId,
      );
      for (const watcherId of watchers) {
        this.server.to(watcherId).emit(RealtimeEvents.PresenceUserOffline, {
          userId: result.userId,
        } as PresenceUserOfflineEvent);
      }
    }
  }

  private async extractUserId(client: Socket): Promise<string | null> {
    try {
      // Getting the session ID from the signed cookie in the socket handshake
      const sessionId = extractSignedSessionId(client);

      // If there's no session ID, we can't determine the user, so return null
      if (!sessionId) {
        return null;
      }

      // Look up the session in the database to get the associated user ID
      const session = await this.sessionsService.findSession(sessionId);

      // If the session doesn't exist or is invalid, return null
      if (!session) {
        return null;
      }

      // Return the user ID associated with the session
      return session.userId;
    } catch (error) {
      console.error('Error extracting user ID from socket connection:', error);
      return null;
    }
  }
}
