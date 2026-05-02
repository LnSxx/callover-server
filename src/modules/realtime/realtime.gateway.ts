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
import { PresenceSubscriptionsService } from '../presenceSubsciptions/presenceSubscriptions.service';
import { PresenceSubscribeDto } from './dto/presence.subscribe.dto';
import {
  CallAnswerRelayEvent,
  CallCancelRelayEvent,
  CallEndRelayEvent,
  CallIceCandidateRelayEvent,
  CallOfferRelayEvent,
  PresenceInitialEvent,
  PresenceUserOfflineEvent,
  PresenceUserOnlineEvent,
  RealtimeEvents,
} from './realtime.events';
import type { AuthedSocket } from './realtime.types';
import { CallsService } from '../calls/calls.service';
import { CallIceCandidateMessageDto } from '../signaling/dto/callIceCandidate.message.dto';
import { CallCancelMessageDto } from '../signaling/dto/callCancel.message.dto';
import { CallOfferMessageDto } from '../signaling/dto/callOffer.message.dto';
import { CallAnswerMessageDto } from '../signaling/dto/callAnswer.message.dto';

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
    private readonly callsService: CallsService,
  ) {}

  @WebSocketServer()
  server!: Server;

  async handleConnection(@ConnectedSocket() client: Socket) {
    const userId = await this.extractUserId(client);

    if (!userId) {
      client.disconnect();
      return;
    }

    this.presenceService.markSocketOnline(userId, client.id);

    // Notify all subscribers that the user has come online
    const watchersUserIds =
      this.presenceSubscriptionsService.getWatchers(userId);

    for (const watcherSocketId of watchersUserIds) {
      this.server.to(watcherSocketId).emit('message', {
        type: RealtimeEvents.PresenceUserOnline,
        payload: {
          userId: userId,
        },
      } as PresenceUserOnlineEvent);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket | AuthedSocket) {
    // Get user ID from socket
    const clientData = client.data as { user?: { id: string } } | undefined;
    const userId = clientData?.user?.id;

    // Check if we know client
    if (!userId) {
      // We do not know who disconnected from socket. Do nothing
      return;
    }

    const call = this.callsService.getCall(userId);
    const socketIdOfCall = call != null ? call.socketId : null;
    if (call && client.id === socketIdOfCall) {
      // Has active call on this socket
      // End call and notify other hand

      const calleeSocketId = this.callsService.getCall(
        call.peerUserId,
      )?.socketId;

      if (calleeSocketId) {
        this.server.to(calleeSocketId).emit('message', {
          type: RealtimeEvents.CallEnd,
          payload: {
            fromUserId: userId,
          },
        } as CallEndRelayEvent);
      }
      this.callsService.endCall(userId);
    }

    // Register disconnection of client and see if user became offline (has no active sockets)
    const result = this.presenceService.markSocketOffline(client.id);

    if (result.becameOffline && result.userId) {
      // Notify all subscribers that the user has gone offline

      // Get users that followed disconnected client
      const watchersUserIds = this.presenceSubscriptionsService.getWatchers(
        result.userId,
      );

      if (watchersUserIds.length != 0) {
        // Send the offline status to all watchers
        for (const watcherSocketId of watchersUserIds) {
          this.server.to(watcherSocketId).emit('message', {
            type: RealtimeEvents.PresenceUserOffline,
            payload: {
              userId: result.userId,
            },
          } as PresenceUserOfflineEvent);
        }
      }

      // Unregister all presence subscriptions of the user as he is now
      // offline and can not receive any presence updates
      this.presenceSubscriptionsService.unsubscribe(userId);
    }
  }

  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new WsException(errors),
    }),
  )
  @SubscribeMessage('presence.subscribe')
  handlePresenceSubscribeMessage(
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
    this.presenceSubscriptionsService.subscribe(userId, body.userIds);

    // Get the initial presence state for the subscribed contacts and send it back to the client
    const onlineUsers = body.userIds.filter((id) =>
      this.presenceService.isUserOnline(id),
    );

    client.emit('message', {
      type: RealtimeEvents.PresenceInitial,
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
