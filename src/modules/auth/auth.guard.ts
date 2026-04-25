import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SessionsService } from '../sessions/sessions.service';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private sessionService: SessionsService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const sessionId = request.signedCookies['sessionId'] as string | undefined;
    if (!sessionId) {
      // No session id was provided with request
      // Unauthorized
      throw new UnauthorizedException();
    }
    try {
      const session = await this.sessionService.findSession(sessionId);
      if (!session) {
        // No session mathcing provided session id
        // Unauthorized
        throw new UnauthorizedException();
      }
      if (session.expirationTime < new Date()) {
        // Session is expired
        // Unauthrized
        throw new UnauthorizedException();
      }
      request['user'] = { id: session.userId };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
