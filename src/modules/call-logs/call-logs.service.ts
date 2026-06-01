import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CallLog, CallLogDocument } from './schemas/call-log.schema';
import { Model, Types } from 'mongoose';
import type {
  CallLogStatus,
  GetCallLogsParams,
  GetCallLogsResult,
} from './types/call-logs.types';
import { CallDirection, CallType } from '../../entities/call';

type CallLogCursor = {
  startedAt: string;
  id: string;
};

@Injectable()
export class CallLogsService {
  constructor(
    @InjectModel(CallLog.name)
    private readonly callLogModel: Model<CallLogDocument>,
  ) {}

  async get(params: GetCallLogsParams): Promise<GetCallLogsResult> {
    const { userId, peerUserId, limit, status, type, direction, cursor } =
      params;

    const normalizedLimit = Math.min(Math.max(limit, 1), 100);

    const andFilters: Record<string, unknown>[] = [
      {
        userId: new Types.ObjectId(userId),
      },
    ];

    if (peerUserId) {
      andFilters.push({
        peerUserId: new Types.ObjectId(peerUserId),
      });
    }

    if (status) {
      andFilters.push({ status });
    }

    if (type) {
      andFilters.push({ type });
    }

    if (direction) {
      andFilters.push({ direction });
    }

    if (cursor) {
      const decodedCursor = this.decodeCursor(cursor);
      const cursorStartedAt = new Date(decodedCursor.startedAt);
      const cursorId = new Types.ObjectId(decodedCursor.id);

      andFilters.push({
        $or: [
          {
            startedAt: { $lt: cursorStartedAt },
          },
          {
            startedAt: cursorStartedAt,
            _id: { $lt: cursorId },
          },
        ],
      });
    }

    const filter =
      andFilters.length === 1 ? andFilters[0] : { $and: andFilters };

    const items = await this.callLogModel
      .find(filter)
      .sort({ startedAt: -1, _id: -1 })
      .limit(normalizedLimit + 1)
      .exec();

    const hasNextPage = items.length > normalizedLimit;
    const pageItems = hasNextPage ? items.slice(0, normalizedLimit) : items;
    const lastItem = pageItems[pageItems.length - 1];

    return {
      data: pageItems,
      nextCursor:
        hasNextPage && lastItem
          ? this.encodeCursor({
              startedAt: lastItem.startedAt.toISOString(),
              id: lastItem._id.toString(),
            })
          : null,
    };
  }

  async createCallLog(params: {
    callId: string;
    userId: string;
    peerUserId: string;
    peerUserName?: string;
    startedAt: Date;
    answeredAt?: Date;
    endedAt?: Date;
    direction: CallDirection;
    type: CallType;
    status: CallLogStatus;
  }): Promise<void> {
    const durationSeconds =
      params.answeredAt && params.endedAt
        ? Math.max(
            0,
            Math.floor(
              (params.endedAt.getTime() - params.answeredAt.getTime()) / 1000,
            ),
          )
        : undefined;

    const ringingDurationSeconds = Math.max(
      0,
      Math.floor(
        ((params.answeredAt ?? params.endedAt ?? new Date()).getTime() -
          params.startedAt.getTime()) /
          1000,
      ),
    );

    await this.callLogModel.create({
      callId: params.callId,
      userId: new Types.ObjectId(params.userId),
      peerUserId: new Types.ObjectId(params.peerUserId),
      peerUserName: params.peerUserName,
      startedAt: params.startedAt,
      answeredAt: params.answeredAt,
      endedAt: params.endedAt,
      direction: params.direction,
      type: params.type,
      status: params.status,
      durationSeconds,
      ringingDurationSeconds,
    });
  }

  private encodeCursor(cursor: CallLogCursor): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }

  private decodeCursor(cursor: string): CallLogCursor {
    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as CallLogCursor;

      if (
        !decoded.startedAt ||
        !decoded.id ||
        !Types.ObjectId.isValid(decoded.id)
      ) {
        throw new Error();
      }

      const startedAt = new Date(decoded.startedAt);

      if (Number.isNaN(startedAt.getTime())) {
        throw new Error();
      }

      return decoded;
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }
}
