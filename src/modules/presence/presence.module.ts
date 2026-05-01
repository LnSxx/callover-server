import { Module } from '@nestjs/common';
import { PresenceService } from './presence.service';

@Module({
  imports: [],
  providers: [PresenceService],
  exports: [PresenceService],
})
export class PresenceModule {}
