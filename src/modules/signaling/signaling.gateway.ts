import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { PresenceService } from '../presence/presence.service';
import { CallsService } from '../calls/calls.service';
import { CallIceCandidateMessageDto } from './dto/callIceCandidate.message.dto';
import { CallCancelMessageDto } from './dto/callCancel.message.dto';
import { CallOfferMessageDto } from './dto/callOffer.message.dto';
import { CallAnswerMessageDto } from './dto/callAnswer.message.dto';
import { RealtimeAuthGuard } from '../realtime/realtime.guard';
import { Server } from 'socket.io';
import type { AuthedSocket } from '../realtime/realtime.types';
import { SignalingEventTypes } from './signaling.events';
import {
  CallAnswerEvent,
  CallCancelEvent,
  CallDeclineEvent,
  CallEndEvent,
  CallIceCandidateEvent,
  CallOfferEvent,
} from './signaling.types';
import { CallDeclineMessageDto } from './dto/callDecline.message.dto';
import { CallPermissionsService } from '../call-permissions/call-permissions.service';

@WebSocketGateway({
  namespace: 'events',
  transports: ['websocket'],
  cors: {
    origin: ['http://localhost:5173'],
    credentials: true,
  },
})
@UseGuards(RealtimeAuthGuard)
export class SignalingGateway {
  constructor(
    private readonly presenceService: PresenceService,
    private readonly callPermissionsService: CallPermissionsService,
    private readonly callsService: CallsService,
  ) {}

  @WebSocketServer()
  server!: Server;

  private getUserIdOrDisconnect(client: AuthedSocket): string | null {
    const clientData = client.data as { user?: { id: string } } | undefined;
    const userId = clientData?.user?.id;

    if (!userId) {
      client.disconnect();
      return null;
    }

    return userId;
  }

  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new WsException(errors),
    }),
  )
  @SubscribeMessage(SignalingEventTypes.CallOffer)
  async handleCallOfferMessage(
    @MessageBody() body: CallOfferMessageDto,
    @ConnectedSocket() client: AuthedSocket,
  ) {
    const userId = this.getUserIdOrDisconnect(client);
    if (!userId) return;

    const callPermissions =
      await this.callPermissionsService.getCallPermissions({
        callerUserId: userId,
        calleeUserId: body.toUserId,
      });

    if (!callPermissions.canCall) {
      return;
    }

    const result = await this.callsService.initiateCall({
      type: body.type,
      fromUserId: userId,
      toUserId: body.toUserId,
      socketId: client.id,
    });

    if (!result.success) {
      return;
    }

    const targetSockets = await this.presenceService.getSocketIdsForUser(
      body.toUserId,
    );

    if (targetSockets.length === 0) {
      await this.callsService.endCall(userId);
      return;
    }

    await client.join(result.call.roomId);

    for (const socketId of targetSockets) {
      this.server.to(socketId).emit('message', {
        type: SignalingEventTypes.CallOffer,
        payload: {
          fromUserId: userId,
          sdp: body.sdp,
          type: body.type,
        },
      } as CallOfferEvent);
    }
  }

  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new WsException(errors),
    }),
  )
  @SubscribeMessage(SignalingEventTypes.CallAnswer)
  async handleCallAnswerMessage(
    @MessageBody() body: CallAnswerMessageDto,
    @ConnectedSocket() client: AuthedSocket,
  ) {
    const userId = this.getUserIdOrDisconnect(client);
    if (!userId) return;

    const acceptedCall = await this.callsService.acceptCall({
      userId: userId,
      socketId: client.id,
    });

    if (!acceptedCall) {
      return;
    }

    await client.join(acceptedCall.roomId);

    client.to(acceptedCall.roomId).emit('message', {
      type: SignalingEventTypes.CallAnswer,
      payload: {
        fromUserId: userId,
        sdp: body.sdp,
      },
    } as CallAnswerEvent);
  }

  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new WsException(errors),
    }),
  )
  @SubscribeMessage(SignalingEventTypes.CallDecline)
  async handleCallDeclineMessage(
    @MessageBody() body: CallDeclineMessageDto,
    @ConnectedSocket() client: AuthedSocket,
  ) {
    const userId = this.getUserIdOrDisconnect(client);
    if (!userId) return;

    const call = await this.callsService.getCall(userId);

    if (!call) {
      return;
    }

    client.to(call.roomId).emit('message', {
      type: SignalingEventTypes.CallDecline,
      payload: {
        fromUserId: userId,
      },
    } as CallDeclineEvent);

    await this.callsService.endCall(userId);

    return;
  }

  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new WsException(errors),
    }),
  )
  @SubscribeMessage(SignalingEventTypes.CallCancel)
  async handleCallCancelMessage(
    @MessageBody() body: CallCancelMessageDto,
    @ConnectedSocket() client: AuthedSocket,
  ) {
    const userId = this.getUserIdOrDisconnect(client);
    if (!userId) return;

    const call = await this.callsService.getCall(userId);

    if (!call) {
      return;
    }

    const calleeSockets = await this.presenceService.getSocketIdsForUser(
      call.peerUserId,
    );

    for (const socketId of calleeSockets) {
      this.server.to(socketId).emit('message', {
        type: SignalingEventTypes.CallCancel,
        payload: {
          fromUserId: userId,
        },
      } as CallCancelEvent);
    }

    await this.callsService.endCall(userId);
  }

  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new WsException(errors),
    }),
  )
  @SubscribeMessage(SignalingEventTypes.CallEnd)
  async handleCallEndMessage(
    @MessageBody() body: CallCancelMessageDto,
    @ConnectedSocket() client: AuthedSocket,
  ) {
    const fromUserId = this.getUserIdOrDisconnect(client);
    if (!fromUserId) return;

    const call = await this.callsService.getCall(fromUserId);

    if (!call) {
      return;
    }

    client.to(call.roomId).emit('message', {
      type: SignalingEventTypes.CallEnd,
      payload: {
        fromUserId,
      },
    } as CallEndEvent);

    await this.callsService.endCall(fromUserId);
  }

  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new WsException(errors),
    }),
  )
  @SubscribeMessage(SignalingEventTypes.CallIceCandidate)
  async handleCallIceCandidateMessage(
    @MessageBody() body: CallIceCandidateMessageDto,
    @ConnectedSocket() client: AuthedSocket,
  ) {
    const fromUserId = this.getUserIdOrDisconnect(client);
    if (!fromUserId) return;

    const call = await this.callsService.getCall(fromUserId);

    if (!call) {
      return;
    }

    client.to(call.roomId).emit('message', {
      type: SignalingEventTypes.CallIceCandidate,
      payload: {
        fromUserId,
        sdp: body.sdp,
        sdpMLineIndex: body.sdpMLineIndex,
        sdpMid: body.sdpMid,
      },
    } as CallIceCandidateEvent);
  }
}
