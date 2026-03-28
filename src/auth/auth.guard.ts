
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { SessionsService } from 'src/sessions/sessions.service';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private sessionService: SessionsService, private reflector: Reflector) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const sessionId = request.signedCookies['sessionId'];
        if (!sessionId) {
            throw new UnauthorizedException();
        }
        try {
            const session = await this.sessionService.findSession(sessionId);
            if (!session) {
                throw new UnauthorizedException();
            }
            if (session.expirationTime < new Date()) return false;
            request['user'] = { id: session.userId };
            return true;
        } catch {
            throw new UnauthorizedException();
        }
    }
}
