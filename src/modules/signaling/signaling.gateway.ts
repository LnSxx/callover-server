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
  CallEndEvent,
  CallIceCandidateEvent,
  CallOfferEvent,
} from './signaling.types';

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
    const clientData = client.data as { user?: { id: string } } | undefined;
    const userId = clientData?.user?.id;

    if (!userId) {
      client.disconnect();
      return;
    }

    // Trying to initiate the call and create a call room
    const result = this.callsService.initiateCall({
      type: body.type,
      fromUserId: userId,
      toUserId: body.toUserId,
      socketId: client.id,
    });

    if (!result.success) {
      // Call initiation failed
      // User is busy or blocked, or some other reason
      // TODO: Send an appropriate error message back to the caller
      return;
    }

    // Check if the target user is online and has active sockets
    const targetSockets = this.presenceService.getSocketIdsForUser(
      body.toUserId,
    );

    if (targetSockets.length === 0) {
      // TODO: Implement wake up call logic here
      // Right now can not send the call offer
      return;
    }

    // Can send the offer
    // Joining user to the call room
    await client.join(result.call.roomId);

    // Sending the call offer to the target user
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
        type: SignalingEventTypes.CallAnswer,
        payload: {
          fromUserId: userId,
        },
      } as CallAnswerEvent);

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
      type: SignalingEventTypes.CallAnswer,
      payload: {
        fromUserId: userId,
        sdp: body.sdp,
      },
    } as CallAnswerEvent);

    // Joining user to the call room
    await client.join(call.roomId);
  }

  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) => new WsException(errors),
    }),
  )
  @SubscribeMessage(SignalingEventTypes.CallCancel)
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
    const calleeSockets = this.presenceService.getSocketIdsForUser(
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

    // Ending the call and cleaning up the call room
    this.callsService.endCall(userId);
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
      type: SignalingEventTypes.CallEnd,
      payload: {
        fromUserId: fromUserId,
      },
    } as CallEndEvent);

    this.callsService.endCall(fromUserId);
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
      type: SignalingEventTypes.CallIceCandidate,
      payload: {
        fromUserId: fromUserId,
        candidate: body.candidate,
      },
    } as CallIceCandidateEvent);
  }
}
