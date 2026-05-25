import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (_, ctx: ExecutionContext): { id: string } => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request['user'] as { id: string };
  },
);
