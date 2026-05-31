/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { ContactsService } from '../contacts/contacts.service';
import { CallPermissionsService } from './call-permissions.service';

describe('CallPermissionsService', () => {
  let service: CallPermissionsService;

  const contactsService = {
    findContactConnection: jest.fn(),
  } as unknown as jest.Mocked<Pick<ContactsService, 'findContactConnection'>>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CallPermissionsService(
      contactsService as unknown as ContactsService,
    );
  });

  it('should allow call but not wake device if caller is not in contacts', async () => {
    contactsService.findContactConnection.mockResolvedValue(null);

    const result = await service.getCallPermissions({
      callerUserId: 'caller-1',
      calleeUserId: 'callee-1',
    });

    expect(result).toEqual({
      canCall: true,
      shouldWakeDevice: false,
    });
  });

  it('should deny call if caller is blocked', async () => {
    contactsService.findContactConnection.mockResolvedValue({
      isBlocked: true,
      isMuted: false,
    } as any);

    const result = await service.getCallPermissions({
      callerUserId: 'caller-1',
      calleeUserId: 'callee-1',
    });

    expect(result).toEqual({
      canCall: false,
      shouldWakeDevice: false,
    });
  });

  it('should allow call but not wake device if caller is muted', async () => {
    contactsService.findContactConnection.mockResolvedValue({
      isBlocked: false,
      isMuted: true,
    } as any);

    const result = await service.getCallPermissions({
      callerUserId: 'caller-1',
      calleeUserId: 'callee-1',
    });

    expect(result).toEqual({
      canCall: true,
      shouldWakeDevice: false,
    });
  });

  it('should allow call and wake device for normal contact', async () => {
    contactsService.findContactConnection.mockResolvedValue({
      isBlocked: false,
      isMuted: false,
    } as any);

    const result = await service.getCallPermissions({
      callerUserId: 'caller-1',
      calleeUserId: 'callee-1',
    });

    expect(result).toEqual({
      canCall: true,
      shouldWakeDevice: true,
    });
  });

  it('should search contact from callee contacts to caller user', async () => {
    contactsService.findContactConnection.mockResolvedValue(null);

    await service.getCallPermissions({
      callerUserId: 'caller-1',
      calleeUserId: 'callee-1',
    });

    expect(contactsService.findContactConnection).toHaveBeenCalledWith({
      ownerId: 'callee-1',
      contactUserId: 'caller-1',
    });
  });
});
