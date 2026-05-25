import { Injectable } from '@nestjs/common';
import { ContactsService } from '../contacts/contacts.service';

export type CallPermissions = {
  canCall: boolean;
  shouldWakeDevice: boolean;
};

@Injectable()
export class CallPermissionsService {
  constructor(private readonly contactsService: ContactsService) {}

  async getCallPermissions({
    callerUserId,
    calleeUserId,
  }: {
    callerUserId: string;
    calleeUserId: string;
  }): Promise<CallPermissions> {
    const callerContact = await this.contactsService.findContactConnection({
      ownerId: calleeUserId,
      contactUserId: callerUserId,
    });

    if (!callerContact) {
      return {
        canCall: true,
        shouldWakeDevice: false,
      };
    }

    if (callerContact.isBlocked) {
      return {
        canCall: false,
        shouldWakeDevice: false,
      };
    }

    return {
      canCall: true,
      shouldWakeDevice: !callerContact.isMuted,
    };
  }
}
