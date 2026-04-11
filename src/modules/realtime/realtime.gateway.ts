import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server } from 'socket.io';
import type { AuthedSocket } from './realtime.types';
import { RealtimeAuthGuard } from './realtime.guard';
import { Socket } from 'socket.io';
import { extractSignedSessionId } from './realtime.utils';

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
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() body: unknown,
    @ConnectedSocket() client: AuthedSocket,
  ) {
    console.log('incoming message', body);

    client.emit('message', {
      ok: true,
      received: body,
    });
  }

  handleConnection(@ConnectedSocket() client: Socket) {
    const sessionId = extractSignedSessionId(client);

    if (!sessionId) {
      console.log('No session cookie');
      client.disconnect();
      return;
    }

    console.log('connected', {
      socketId: client.id,
    });
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log('disconnected', {
      socketId: client.id,
    });
  }
}
