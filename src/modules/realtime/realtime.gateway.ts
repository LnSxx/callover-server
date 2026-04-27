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
import { CallIceCandidateMessageDto } from './dto/callIceCandidate.message.dto';
import { CallCancelMessageDto } from './dto/callCancel.message.dto';
import { CallOfferMessageDto } from './dto/callOffer.message.dto';
import { CallAnswerMessageDto } from './dto/callAnswer.message.dto';

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

    const result = this.presenceService.handleConnection(userId, client);

    if (result.becameOnline) {
      // Notify all subscribers that the user has come online
      const watchersUserIds =
        this.presenceSubscriptionsService.getWatchers(userId);

      const watcherSocketIds = Array.from(watchersUserIds).flatMap(
        (watcherUserId) => {
          const sockets = this.presenceService.getSocketsForUser(watcherUserId);
          return Array.from(sockets);
        },
      );
      for (const watcherSocketId of watcherSocketIds) {
        this.server.to(watcherSocketId).emit('message', {
          type: RealtimeEvents.PresenceUserOnline,
          payload: {
            userId: result.userId,
          },
        } as PresenceUserOnlineEvent);
      }
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
    const result = this.presenceService.handleDisconnect(client);

    if (result.becameOffline && result.userId) {
      // Notify all subscribers that the user has gone offline

      // Get users that followed disconnected client
      const watchersUserIds = this.presenceSubscriptionsService.getWatchers(
        result.userId,
      );

      if (watchersUserIds.size != 0) {
        // User has watchers, notify them about disconnection
        const watcherSocketIds = Array.from(watchersUserIds).flatMap(
          (watcherUserId) => {
            const sockets =
              this.presenceService.getSocketsForUser(watcherUserId);
            return Array.from(sockets);
          },
        );

        // Send the offline status to all watchers
        for (const watcherSocketId of watcherSocketIds) {
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

  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new WsException(errors),
    }),
  )
  @SubscribeMessage(RealtimeEvents.CallOffer)
  async handleCallOfferMessage(
    @MessageBody() body: CallOfferMessageDto,
    @ConnectedSocket() client: AuthedSocket,
  ) {
    const clientData = client.data as { user?: { id: string } } | undefined;
    const userId = clientData?.user?.id;

    if (!userId) {
      client.disconnect();
      return;
    }

    // Trying to initiate the call and create a call room
    const roomId = this.callsService.initiateCall({
      fromUserId: userId,
      toUserId: body.toUserId,
      socketId: client.id,
    });

    if (!roomId) {
      // Call initiation failed
      // User is busy or blocked, or some other reason
      // TODO: Send an appropriate error message back to the caller
      return;
    }

    // Check if the target user is online and has active sockets
    const targetSockets = this.presenceService.getSocketsForUser(body.toUserId);

    if (targetSockets.size === 0) {
      // TODO: Implement wake up call logic here
      // Right now can not send the call offer
      return;
    }

    // Can send the offer
    // Joining user to the call room
    await client.join(roomId);

    // Sending the call offer to the target user
    for (const socketId of targetSockets) {
      this.server.to(socketId).emit('message', {
        type: RealtimeEvents.CallOffer,
        payload: {
          fromUserId: userId,
          sdp: body.sdp,
          type: body.type,
        },
      } as CallOfferRelayEvent);
    }
  }

  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new WsException(errors),
    }),
  )
  @SubscribeMessage(RealtimeEvents.CallAnswer)
  async handleCallAnswerMessage(
    @MessageBody() body: CallAnswerMessageDto,
    @ConnectedSocket() client: AuthedSocket,
  ) {
    const clientData = client.data as { user?: { id: string } } | undefined;
    const userId = clientData?.user?.id;

    if (!userId) {
      client.disconnect();
      return;
    }

    // Check if user send Session Description Protocol (SDP) in the call answer message
    // If sdp is null it means user declined the call
    if (!body.sdp) {
      // User declined :(
      // Sending the call decline message to the caller

      // Getting the caller's specific room
      const call = this.callsService.getCall(userId);

      if (!call) {
        // Weird state
        // No active call found for the user, can't send the decline message
        return;
      }

      // Getting caller's specific room and sending the call decline message to the caller
      client.to(call.roomId).emit('message', {
        type: RealtimeEvents.CallAnswer,
        payload: {
          fromUserId: userId,
        },
      } as CallAnswerRelayEvent);

      // Ending the call and cleaning up the call room
      this.callsService.endCall(userId);
      return;
    }

    // User accepted the call
    // Getting the caller's specific room
    const call = this.callsService.getCall(userId);
    if (!call) {
      // Weird state
      // No active call found for the user, can't send the answer message
      return;
    }

    // Getting caller's specific room and sending the call answer message to the caller
    client.to(call.roomId).emit('message', {
      type: RealtimeEvents.CallAnswer,
      payload: {
        fromUserId: userId,
        sdp: body.sdp,
      },
    } as CallAnswerRelayEvent);

    // Joining user to the call room
    await client.join(call.roomId);
  }

  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new WsException(errors),
    }),
  )
  @SubscribeMessage(RealtimeEvents.CallCancel)
  handleCallCancelMessage(
    @MessageBody() body: CallCancelMessageDto,
    @ConnectedSocket() client: AuthedSocket,
  ) {
    const clientData = client.data as { user?: { id: string } } | undefined;
    const userId = clientData?.user?.id;

    if (!userId) {
      client.disconnect();
      return;
    }

    // Getting the caller's specific room
    const call = this.callsService.getCall(userId);
    if (!call) {
      // Weird state
      // No active call found for the user, can't send the cancel message
      return;
    }

    // Sending the call cancel message to the callee
    const calleeSockets = this.presenceService.getSocketsForUser(
      call.peerUserId,
    );
    for (const socketId of calleeSockets) {
      this.server.to(socketId).emit('message', {
        type: RealtimeEvents.CallCancel,
        payload: {
          fromUserId: userId,
        },
      } as CallCancelRelayEvent);
    }

    // Ending the call and cleaning up the call room
    this.callsService.endCall(userId);
  }

  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new WsException(errors),
    }),
  )
  @SubscribeMessage(RealtimeEvents.CallEnd)
  handleCallEndMessage(
    @MessageBody() body: CallCancelMessageDto,
    @ConnectedSocket() client: AuthedSocket,
  ) {
    const clientData = client.data as { user?: { id: string } };
    const fromUserId = clientData.user?.id;

    if (!fromUserId) {
      client.disconnect();
      return;
    }

    // Getting the call room for the user
    const call = this.callsService.getCall(fromUserId);
    if (!call) {
      // No active call found for the user, can't cancel non-existing call
      return;
    }

    client.to(call.roomId).emit('message', {
      type: RealtimeEvents.CallEnd,
      payload: {
        fromUserId: fromUserId,
      },
    } as CallEndRelayEvent);

    this.callsService.endCall(fromUserId);
  }

  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new WsException(errors),
    }),
  )
  @SubscribeMessage(RealtimeEvents.CallIceCandidate)
  handleCallIceCandidateMessage(
    @MessageBody() body: CallIceCandidateMessageDto,
    @ConnectedSocket() client: AuthedSocket,
  ) {
    const clientData = client.data as { user?: { id: string } };
    const fromUserId = clientData.user?.id;

    if (!fromUserId) {
      client.disconnect();
      return;
    }

    // Getting the call room for the user
    const call = this.callsService.getCall(fromUserId);
    if (!call) {
      // No active call found for the user, can't send the ICE candidate
      return;
    }

    // Sending the ICE candidate to the other user in the call room
    this.server.to(call.roomId).emit('message', {
      type: RealtimeEvents.CallIceCandidate,
      payload: {
        fromUserId: fromUserId,
        candidate: body.candidate,
      },
    } as CallIceCandidateRelayEvent);
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
