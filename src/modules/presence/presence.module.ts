import { Module } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [SessionsModule],
  providers: [PresenceService],
  exports: [PresenceService],
})
export class PresenceModule {}
