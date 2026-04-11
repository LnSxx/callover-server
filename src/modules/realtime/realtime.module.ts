import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [SessionsModule],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
