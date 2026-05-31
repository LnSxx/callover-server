import { Injectable } from '@nestjs/common';
import { PresenceService } from '../presence/presence.service';
import { RealtimeEventBusService } from '../realtime/realtime-event-bus.service';
import { SignalingEventTypes } from '../signaling/signaling.events';
import { CallTimeoutEvent } from '../signaling/signaling.types';

@Injectable()
export class CallTimeoutNotifierService {
  constructor(
    private readonly realtimeEventBusService: RealtimeEventBusService,
    private readonly presenceService: PresenceService,
  ) {}

  async notifyRingingTimeout(params: {
    roomId: string;
    calleeUserId: string;
  }): Promise<void> {
    const event: CallTimeoutEvent = {
      type: SignalingEventTypes.CallTimeout,
      payload: {
        roomId: params.roomId,
        reason: 'no_answer',
      },
    };

    this.realtimeEventBusService.emitToRoom(params.roomId, event);

    const calleeSocketIds = await this.presenceService.getSocketIdsForUser(
      params.calleeUserId,
    );

    this.realtimeEventBusService.emitToSockets(calleeSocketIds, event);
  }

  notifyMaxDurationTimeout(params: { roomId: string }): void {
    const event: CallTimeoutEvent = {
      type: SignalingEventTypes.CallTimeout,
      payload: {
        roomId: params.roomId,
        reason: 'max_duration',
      },
    };

    this.realtimeEventBusService.emitToRoom(params.roomId, event);
  }
}
