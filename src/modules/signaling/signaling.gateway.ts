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
import { CallDeclineMessageDto } from './dto/callDecline.message.sto';

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
    private readonly callsService: CallsService,
  ) {}

  @WebSocketServer()
  server!: Server;

  private log(action: string, data?: Record<string, unknown>) {
    console.log(`[SignalingGateway] ${action}`, data ?? '');
  }

  private getUserIdOrDisconnect(client: AuthedSocket): string | null {
    const clientData = client.data as { user?: { id: string } } | undefined;
    const userId = clientData?.user?.id;

    if (!userId) {
      this.log('unauthorized socket, disconnecting', {
        socketId: client.id,
        hasClientData: Boolean(clientData),
      });

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

    this.log('CallOffer received', {
      fromUserId: userId,
      toUserId: body.toUserId,
      socketId: client.id,
      callType: body.type,
      hasSdp: Boolean(body.sdp),
    });

    const result = this.callsService.initiateCall({
      type: body.type,
      fromUserId: userId,
      toUserId: body.toUserId,
      socketId: client.id,
    });

    if (!result.success) {
      this.log('CallOffer rejected by callsService', {
        fromUserId: userId,
        toUserId: body.toUserId,
        socketId: client.id,
      });
      return;
    }

    this.log('CallOffer call initiated', {
      fromUserId: userId,
      toUserId: body.toUserId,
      roomId: result.call.roomId,
      peerUserId: result.call.peerUserId,
    });

    const targetSockets = await this.presenceService.getSocketIdsForUser(
      body.toUserId,
    );

    this.log('CallOffer target sockets resolved', {
      toUserId: body.toUserId,
      targetSocketCount: targetSockets.length,
      targetSockets,
    });

    if (targetSockets.length === 0) {
      this.log('CallOffer stopped, target user has no active sockets', {
        fromUserId: userId,
        toUserId: body.toUserId,
        roomId: result.call.roomId,
      });
      return;
    }

    await client.join(result.call.roomId);

    this.log('CallOffer caller joined room', {
      fromUserId: userId,
      socketId: client.id,
      roomId: result.call.roomId,
    });

    for (const socketId of targetSockets) {
      this.log('CallOffer emitting to target socket', {
        fromUserId: userId,
        toUserId: body.toUserId,
        targetSocketId: socketId,
        roomId: result.call.roomId,
        hasSdp: Boolean(body.sdp),
      });

      this.server.to(socketId).emit('message', {
        type: SignalingEventTypes.CallOffer,
        payload: {
          fromUserId: userId,
          sdp: body.sdp,
          type: body.type,
        },
      } as CallOfferEvent);
    }

    this.log('CallOffer completed', {
      fromUserId: userId,
      toUserId: body.toUserId,
      emittedToSocketCount: targetSockets.length,
      roomId: result.call.roomId,
    });
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

    this.log('CallAnswer received', {
      fromUserId: userId,
      socketId: client.id,
    });

    const call = this.callsService.getCall(userId);

    if (!call) {
      this.log('CallAnswer stopped, no active call found', {
        fromUserId: userId,
        socketId: client.id,
      });
      return;
    }

    this.log('CallAnswer emitting SDP answer to room', {
      fromUserId: userId,
      roomId: call.roomId,
      peerUserId: call.peerUserId,
    });

    client.to(call.roomId).emit('message', {
      type: SignalingEventTypes.CallAnswer,
      payload: {
        fromUserId: userId,
        sdp: body.sdp,
      },
    } as CallAnswerEvent);

    await client.join(call.roomId);

    this.log('CallAnswer client joined room', {
      fromUserId: userId,
      socketId: client.id,
      roomId: call.roomId,
    });

    this.log('CallAnswer completed', {
      fromUserId: userId,
      roomId: call.roomId,
    });
  }

  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new WsException(errors),
    }),
  )
  @SubscribeMessage(SignalingEventTypes.CallDecline)
  handleCallDeclineMessage(
    @MessageBody() body: CallDeclineMessageDto,
    @ConnectedSocket() client: AuthedSocket,
  ) {
    const userId = this.getUserIdOrDisconnect(client);
    if (!userId) return;

    const call = this.callsService.getCall(userId);

    if (!call) {
      this.log('CallDecline stopped, no active call found', {
        fromUserId: userId,
        socketId: client.id,
      });
      return;
    }

    this.log('CallDecline emitting empty answer to room', {
      fromUserId: userId,
      roomId: call.roomId,
      peerUserId: call.peerUserId,
    });

    client.to(call.roomId).emit('message', {
      type: SignalingEventTypes.CallDecline,
      payload: {
        fromUserId: userId,
      },
    } as CallDeclineEvent);

    this.callsService.endCall(userId);

    this.log('CallDecline ended call after decline messages', {
      fromUserId: userId,
      roomId: call.roomId,
    });

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

    this.log('CallCancel received', {
      fromUserId: userId,
      socketId: client.id,
      bodyKeys: Object.keys(body ?? {}),
    });

    const call = this.callsService.getCall(userId);

    if (!call) {
      this.log('CallCancel stopped, no active call found', {
        fromUserId: userId,
        socketId: client.id,
      });
      return;
    }

    const calleeSockets = await this.presenceService.getSocketIdsForUser(
      call.peerUserId,
    );

    this.log('CallCancel target sockets resolved', {
      fromUserId: userId,
      peerUserId: call.peerUserId,
      roomId: call.roomId,
      targetSocketCount: calleeSockets.length,
      targetSockets: calleeSockets,
    });

    for (const socketId of calleeSockets) {
      this.log('CallCancel emitting to peer socket', {
        fromUserId: userId,
        peerUserId: call.peerUserId,
        targetSocketId: socketId,
        roomId: call.roomId,
      });

      this.server.to(socketId).emit('message', {
        type: SignalingEventTypes.CallCancel,
        payload: {
          fromUserId: userId,
        },
      } as CallCancelEvent);
    }

    this.callsService.endCall(userId);

    this.log('CallCancel completed, call ended', {
      fromUserId: userId,
      peerUserId: call.peerUserId,
      roomId: call.roomId,
      emittedToSocketCount: calleeSockets.length,
    });
  }

  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new WsException(errors),
    }),
  )
  @SubscribeMessage(SignalingEventTypes.CallEnd)
  handleCallEndMessage(
    @MessageBody() body: CallCancelMessageDto,
    @ConnectedSocket() client: AuthedSocket,
  ) {
    const fromUserId = this.getUserIdOrDisconnect(client);
    if (!fromUserId) return;

    this.log('CallEnd received', {
      fromUserId,
      socketId: client.id,
      bodyKeys: Object.keys(body ?? {}),
    });

    const call = this.callsService.getCall(fromUserId);

    if (!call) {
      this.log('CallEnd stopped, no active call found', {
        fromUserId,
        socketId: client.id,
      });
      return;
    }

    this.log('CallEnd emitting to room', {
      fromUserId,
      roomId: call.roomId,
      peerUserId: call.peerUserId,
    });

    client.to(call.roomId).emit('message', {
      type: SignalingEventTypes.CallEnd,
      payload: {
        fromUserId,
      },
    } as CallEndEvent);

    this.callsService.endCall(fromUserId);

    this.log('CallEnd completed, call ended', {
      fromUserId,
      peerUserId: call.peerUserId,
      roomId: call.roomId,
    });
  }

  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new WsException(errors),
    }),
  )
  @SubscribeMessage(SignalingEventTypes.CallIceCandidate)
  handleCallIceCandidateMessage(
    @MessageBody() body: CallIceCandidateMessageDto,
    @ConnectedSocket() client: AuthedSocket,
  ) {
    const fromUserId = this.getUserIdOrDisconnect(client);
    if (!fromUserId) return;

    const call = this.callsService.getCall(fromUserId);

    if (!call) {
      return;
    }

    this.server.to(call.roomId).emit('message', {
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
