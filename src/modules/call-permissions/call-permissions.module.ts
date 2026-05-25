import { Module } from '@nestjs/common';
import { ContactsModule } from '../contacts/contacts.module';
import { CallPermissionsService } from './call-permissions.service';

@Module({
  imports: [ContactsModule],
  providers: [CallPermissionsService],
  exports: [CallPermissionsService],
})
export class CallPermissionsModule {}
