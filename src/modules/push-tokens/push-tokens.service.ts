import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  PushToken,
  PushTokenDocument,
  PushTokenEnvironment,
  PushTokenPlatform,
  PushTokenProvider,
} from './schemas/push-token.schema';
import { getAppEnv } from '../../config/app.config';

@Injectable()
export class PushTokensService {
  constructor(
    @InjectModel(PushToken.name)
    private readonly pushTokenModel: Model<PushTokenDocument>,
  ) {}

  async save({
    userId,
    provider,
    platform,
    token,
    bundleId,
    deviceId,
    appVersion,
  }: {
    userId: string;
    provider: PushTokenProvider;
    platform: PushTokenPlatform;
    token: string;
    bundleId: string;
    deviceId: string;
    appVersion: string;
  }): Promise<{ saved: boolean }> {
    const appEnv = getAppEnv();

    const environment: PushTokenEnvironment =
      appEnv === 'prod' ? 'production' : 'development';

    await this.pushTokenModel
      .updateOne(
        {
          provider,
          token,
        },
        {
          $set: {
            userId,
            provider,
            platform,
            token,
            bundleId,
            environment,
            deviceId,
            appVersion,
            isActive: true,
          },
          $unset: {
            invalidatedAt: '',
          },
        },
        {
          upsert: true,
          runValidators: true,
        },
      )
      .exec();

    return {
      saved: true,
    };
  }

  async invalidateTokenForUser({
    userId,
    provider,
    token,
  }: {
    userId: string;
    provider: PushTokenProvider;
    token: string;
  }): Promise<{ isInvalidated: boolean }> {
    const result = await this.pushTokenModel
      .updateOne(
        {
          userId,
          provider,
          token,
          isActive: true,
        },
        {
          $set: {
            isActive: false,
            invalidatedAt: new Date(),
          },
        },
      )
      .exec();

    return {
      isInvalidated: result.modifiedCount > 0,
    };
  }

  async deleteToken({
    userId,
    provider,
    token,
  }: {
    userId: string;
    provider: PushTokenProvider;
    token: string;
  }): Promise<{ isDeleted: boolean }> {
    const result = await this.pushTokenModel
      .deleteOne({
        userId,
        provider,
        token,
      })
      .exec();

    return {
      isDeleted: result.deletedCount > 0,
    };
  }

  async deleteAllTokensForUserId(
    userId: string,
  ): Promise<{ deletedCount: number }> {
    const result = await this.pushTokenModel.deleteMany({ userId }).exec();

    return {
      deletedCount: result.deletedCount,
    };
  }

  async findActiveTokensForUserId(
    userId: string,
  ): Promise<PushTokenDocument[]> {
    return this.pushTokenModel
      .find({
        userId,
        isActive: true,
      })
      .exec();
  }

  async findActiveTokensForUserIds(
    userIds: string[],
  ): Promise<PushTokenDocument[]> {
    return this.pushTokenModel
      .find({
        userId: { $in: userIds },
        isActive: true,
      })
      .exec();
  }
}
