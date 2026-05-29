import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CallLog, CallLogDocument } from './schemas/call-log.schema';
import { Model, Types } from 'mongoose';
import type {
  CallLogStatus,
  GetCallLogsParams,
  GetCallLogsResult,
} from './types/call-logs.types';
import { CallDirection, CallType } from '../../entities/call';

@Injectable()
export class CallLogsService {
  constructor(
    @InjectModel(CallLog.name)
    private readonly callLogModel: Model<CallLogDocument>,
  ) {}

  async get(params: GetCallLogsParams): Promise<GetCallLogsResult> {
    const {
      userId,
      peerUserId,
      limit,
      offset,
      status,
      type,
      direction,
      startedAfter,
      startedBefore,
    } = params;

    const filter: {
      userId: Types.ObjectId;
      peerUserId?: Types.ObjectId;
      status?: CallLogStatus;
      type?: CallType;
      direction?: CallDirection;
      startedAt?: {
        $gte?: Date;
        $lte?: Date;
      };
    } = {
      userId: new Types.ObjectId(userId),
    };

    if (peerUserId) {
      filter.peerUserId = new Types.ObjectId(peerUserId);
    }

    if (status) {
      filter.status = status;
    }

    if (type) {
      filter.type = type;
    }

    if (direction) {
      filter.direction = direction;
    }

    if (startedAfter || startedBefore) {
      filter.startedAt = {};
      if (startedAfter) {
        filter.startedAt.$gte = startedAfter;
      }
      if (startedBefore) {
        filter.startedAt.$lte = startedBefore;
      }
    }

    const [data, total] = await Promise.all([
      this.callLogModel
        .find(filter)
        .sort({ startedAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.callLogModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      limit,
      offset,
      count: data.length,
      total,
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
}
