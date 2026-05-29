import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { CallIceCandidateMessageDto } from './dto/call-ice-candidate.message.dto';
import { CallCancelMessageDto } from './dto/call-cancel.message.dto';
import { CallOfferMessageDto } from './dto/call-offer.message.dto';
import { CallAnswerMessageDto } from './dto/call-answer.message.dto';
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
import { CallDeclineMessageDto } from './dto/call-decline.message.dto';
import { CallAdministratorService } from '../call-administrator/call-administrator.service';

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
    private readonly callAdministratorService: CallAdministratorService,
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

    const callInitResult = await this.callAdministratorService.tryInitiateCall({
      callerUserId: userId,
      calleeUserId: body.toUserId,
      callerSocketId: client.id,
      type: body.type,
    });

    if (!callInitResult.success) {
      return;
    }

    await client.join(callInitResult.callRoomId);

    for (const socketId of callInitResult.peerSockets) {
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

    const acceptedCall = await this.callAdministratorService.acceptCall({
      calleeUserId: userId,
      calleeSocketId: client.id,
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

    const endCallResult = await this.callAdministratorService.declineCall({
      calleeUserId: userId,
    });

    if (!endCallResult.declined) {
      return;
    }

    client.to(endCallResult.callRoomId).emit('message', {
      type: SignalingEventTypes.CallDecline,
      payload: {
        fromUserId: userId,
      },
    } as CallDeclineEvent);
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

    const endCallResult = await this.callAdministratorService.cancelCall({
      callerUserId: userId,
    });

    if (!endCallResult.cancelled) {
      return;
    }

    for (const socketId of endCallResult.peerSockets) {
      this.server.to(socketId).emit('message', {
        type: SignalingEventTypes.CallCancel,
        payload: {
          fromUserId: userId,
        },
      } as CallCancelEvent);
    }
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
    const userId = this.getUserIdOrDisconnect(client);
    if (!userId) return;

    const endCallResult = await this.callAdministratorService.endCall({
      userId: userId,
    });

    if (!endCallResult.ended) {
      return;
    }

    client.to(endCallResult.callRoomId).emit('message', {
      type: SignalingEventTypes.CallEnd,
      payload: {
        fromUserId: userId,
      },
    } as CallEndEvent);
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

    const activeCallRoomId =
      await this.callAdministratorService.getCallRoomIdForUserIfHasActiveCall(
        fromUserId,
      );

    if (!activeCallRoomId) {
      return;
    }

    client.to(activeCallRoomId).emit('message', {
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
