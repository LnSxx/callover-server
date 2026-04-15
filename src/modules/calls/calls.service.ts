import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

type Call = {
  target: string;
  roomId: string;
};

@Injectable()
export class CallsService {
  // Map of userId to the call data
  private activeCalls: Map<string, Call> = new Map();

  /**
   * Initiates a call between two users and creates a call room.
   * Returns the call room ID if the call was successfully initiated,
   * or null if the call initiation failed (e.g., if either user is already in an active call).
   * @param fromUserId - The ID of the user initiating the call
   * @param toUserId - The ID of the user being called
   * @returns The call room ID if successful, or null if the call initiation failed
   */
  initiateCall(fromUserId: string, toUserId: string): string | null {
    // Check if either the caller or the callee is already in an active call
    if (this.activeCalls.has(toUserId)) {
      return null;
    }
    // Generate a unique call room ID
    const callId = `call_${fromUserId}_${toUserId}_${Date.now()}`;

    // Store the active call data for both users
    this.activeCalls.set(fromUserId, { target: toUserId, roomId: callId });
    this.activeCalls.set(toUserId, { target: fromUserId, roomId: callId });

    return callId;
  }

  /**
   * Ends an active call for the given user ID. If the user is in an active call,
   * it will remove the call data for both the user and their calling partner.
   * Does nothing if the user is not in an active call.
   * @param userId - The ID of the user ending the call
   */
  endCall(userId: string): void {
    // Getting active call data for the user
    const callee = this.activeCalls.get(userId);
    if (callee) {
      // Has active call and can see who is the calling partner
      // Deleting the active call mapping for the calling partner
      this.activeCalls.delete(callee.target);
    }
    // Deleting the active call mapping for the user
    this.activeCalls.delete(userId);
  }

  /**
   * Returns user's active call data if not null
   * @param userId - The ID of the user
   * @returns The active call data for the user,
   * or null if the user is not in an active call
   */
  getCall(userId: string): Call | null {
    return this.activeCalls.get(userId) || null;
  }
}
