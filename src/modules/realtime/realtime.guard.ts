import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import * as cookie from 'cookie';
import { SessionsService } from '../sessions/sessions.service';
import { AuthedSocket } from './realtime.types';
import cookieParser from 'cookie-parser';
import { Socket } from 'socket.io';
import { extractSignedSessionId } from './realtime.utils';

@Injectable()
export class RealtimeAuthGuard implements CanActivate {
  constructor(private sessionService: SessionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('RealtimeAuthGuard canActivate called');
    const client = context.switchToWs().getClient<Socket>();
    const sessionId = extractSignedSessionId(client);

    if (!sessionId) {
      console.log('No session cookie');

      throw new WsException('No session cookie');
    }

    try {
      const session = await this.sessionService.findSession(sessionId);
      if (!session) {
        console.log('Invalid session');

        throw new WsException('Invalid session');
      }
      if (session.expirationTime < new Date()) return false;
      client.data.user = { id: session.userId };
      return true;
    } catch (error) {
      console.error('RealtimeAuthGuard error:', error);
      throw new WsException('Unauthorized');
    }
  }
}
