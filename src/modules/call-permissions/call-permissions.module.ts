import { Module } from '@nestjs/common';
import { ContactsModule } from '../contacts/contacts.module';

@Module({
  imports: [ContactsModule],
  exports: [],
})
export class CallPermissionsModule {}
