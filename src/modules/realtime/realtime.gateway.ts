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
import { RealtimeAuthGuard } from './realtime.guard';
import { Socket } from 'socket.io';
import { extractSignedSessionId } from './realtime.utils';
import { PresenceService } from '../presence/presence.service';
import { SessionsService } from '../sessions/sessions.service';
import { PresenceSubscriptionsService } from '../presence-subsciptions/presence-subscriptions.service';
import { PresenceSubscribeDto } from './dto/presence.subscribe.dto';
import type { AuthedSocket } from './realtime.types';
import { CallsService } from '../calls/calls.service';
import { PresenceEventTypes } from '../presence/presence.events';
import {
  PresenceInitialEvent,
  PresenceUserOfflineEvent,
  PresenceUserOnlineEvent,
} from '../presence/presence.types';

@WebSocketGateway({
  namespace: 'events',
  transports: ['websocket'],
})
@UseGuards(RealtimeAuthGuard)
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly presenceService: PresenceService,
    private readonly presenceSubscriptionsService: PresenceSubscriptionsService,
    private readonly sessionsService: SessionsService,
    private readonly callsService: CallsService,
  ) {}

  @WebSocketServer()
  server!: Server;

  async handleConnection(@ConnectedSocket() client: AuthedSocket) {
    const userId = await this.extractUserId(client);

    if (!userId) {
      client.disconnect();
      return;
    }

    await this.presenceService.markSocketOnline(userId, client.id);

    client.data.presenceRefreshInterval = setInterval(() => {
      void this.presenceService.refreshSocket(userId, client.id);
      void this.presenceSubscriptionsService.refreshSubscriptions(userId);
    }, 120_000);

    const watcherUserIds =
      await this.presenceSubscriptionsService.getWatchers(userId);

    const watcherSocketIds: string[] = [];

    for (const watcherUserId of watcherUserIds) {
      const socketsForUser =
        await this.presenceService.getSocketIdsForUser(watcherUserId);
      watcherSocketIds.push(...socketsForUser);
    }

    for (const watcherSocketId of watcherSocketIds) {
      this.server.to(watcherSocketId).emit('message', {
        type: PresenceEventTypes.PresenceUserOnline,
        payload: {
          userId: userId,
        },
      } as PresenceUserOnlineEvent);
    }
  }

  async handleDisconnect(client: AuthedSocket) {
    if (client.data.presenceRefreshInterval) {
      clearInterval(client.data.presenceRefreshInterval);
    }

    const result = await this.presenceService.markSocketOffline(client.id);

    if (!result.userId) {
      return;
    }

    const userId = result.userId;

    // TODO: Temporarily disabling call end logic on disconnect due to issues with signaling and call state management. This will be revisited in future updates to ensure proper handling of active calls during disconnections.

    // const call = await this.callsService.getCall(userId);

    // if (call && client.id === call.socketId) {
    //   const peerCall = await this.callsService.getCall(call.peerUserId);
    //   const peerSocketId = peerCall?.socketId;

    //   if (peerSocketId) {
    //     this.server.to(peerSocketId).emit('message', {
    //       type: SignalingEventTypes.CallEnd,
    //       payload: {
    //         fromUserId: userId,
    //       },
    //     } as CallEndEvent);
    //   }

    //   await this.callsService.endCall(userId);
    // }

    if (result.becameOffline) {
      const watcherUserIds =
        await this.presenceSubscriptionsService.getWatchers(userId);

      const watcherSocketIds: string[] = [];

      for (const watcherUserId of watcherUserIds) {
        const socketsForUser =
          await this.presenceService.getSocketIdsForUser(watcherUserId);
        watcherSocketIds.push(...socketsForUser);
      }

      for (const watcherSocketId of watcherSocketIds) {
        this.server.to(watcherSocketId).emit('message', {
          type: PresenceEventTypes.PresenceUserOffline,
          payload: {
            userId,
          },
        } as PresenceUserOfflineEvent);
      }

      await this.presenceSubscriptionsService.unsubscribe(userId);
    }
  }

  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new WsException(errors),
    }),
  )
  @SubscribeMessage('presence.subscribe')
  async handlePresenceSubscribeMessage(
    @MessageBody() body: PresenceSubscribeDto,
    @ConnectedSocket() client: AuthedSocket,
  ) {
    const clientData = client.data as { user?: { id: string } } | undefined;
    const userId = clientData?.user?.id;

    if (!userId) {
      client.disconnect();
      return;
    }
    // Subscribe the user to presence updates for the specified contacts
    await this.presenceSubscriptionsService.subscribe(userId, body.userIds);

    // Get the initial presence state for the subscribed contacts and send it back to the client
    const usersToShow = body.userIds;
    const onlineUsers: string[] = [];

    for (const id of usersToShow) {
      const isOnline = await this.presenceService.isUserOnline(id);
      if (isOnline) {
        onlineUsers.push(id);
      }
    }

    client.emit('message', {
      type: PresenceEventTypes.PresenceInitial,
      payload: {
        onlineUserIds: onlineUsers,
      },
    } as PresenceInitialEvent);
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
      const session = await this.sessionsService.findSessionById(sessionId);

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
