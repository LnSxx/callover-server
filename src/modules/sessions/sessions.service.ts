import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { Session, SessionDocument } from './schemas/session.schema';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';
import type {
  CreateSessionParams,
  CreateSessionResult,
} from './sessions.types';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_SESSION_TTL_DAYS,
  SESSION_TOKEN_BYTES,
} from './sessions.constants';

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    private readonly configService: ConfigService,
  ) {}

  async create({
    userId,
    ipAddress,
    userAgent,
  }: CreateSessionParams): Promise<CreateSessionResult> {
    const sessionId = randomBytes(SESSION_TOKEN_BYTES).toString('hex');
    const sessionIdHash = this.hashSessionId(sessionId);
    const now = new Date();

    const sessionTtlDays = this.getSessionTtlDays();
    const expirationTime = new Date(
      now.getTime() + sessionTtlDays * 24 * 60 * 60 * 1000,
    );

    await this.sessionModel.create({
      sessionIdHash,
      userId,
      ipAddress,
      userAgent,
      lastActivity: now,
      isRevoked: false,
      expirationTime,
    });

    return {
      sessionId,
      expirationTime,
    };
  }

  async findSessionById(sessionId: string): Promise<SessionDocument | null> {
    const sessionIdHash = this.hashSessionId(sessionId);
    return this.sessionModel
      .findOne({
        sessionIdHash,
        isRevoked: false,
        expirationTime: { $gt: new Date() },
      })
      .exec();
  }

  async revokeSession(sessionId: string): Promise<{ isRevoked: boolean }> {
    const sessionIdHash = this.hashSessionId(sessionId);
    const result = await this.sessionModel
      .findOneAndUpdate(
        {
          sessionIdHash,
          isRevoked: false,
          expirationTime: { $gt: new Date() },
        },
        {
          $set: { isRevoked: true },
        },
      )
      .exec();

    return {
      isRevoked: !!result,
    };
  }

  async revokeAllSessionsForUserId(
    userId: string,
  ): Promise<{ revokedCount: number }> {
    const result = await this.sessionModel
      .updateMany(
        {
          userId,
          isRevoked: false,
          expirationTime: { $gt: new Date() },
        },
        {
          $set: {
            isRevoked: true,
          },
        },
      )
      .exec();

    return {
      revokedCount: result.modifiedCount,
    };
  }

  async deleteSession(sessionId: string): Promise<{ isDeleted: boolean }> {
    const sessionIdHash = this.hashSessionId(sessionId);
    const result = await this.sessionModel
      .findOneAndDelete({ sessionIdHash })
      .exec();

    return {
      isDeleted: !!result,
    };
  }

  async deleteAllSessionsForUserId(
    userId: string,
  ): Promise<{ deletedCount: number }> {
    const result = await this.sessionModel.deleteMany({ userId }).exec();

    return {
      deletedCount: result.deletedCount,
    };
  }

  async updateActivity(sessionId: string): Promise<{ isUpdated: boolean }> {
    const sessionIdHash = this.hashSessionId(sessionId);
    const result = await this.sessionModel
      .updateOne(
        {
          sessionIdHash,
          isRevoked: false,
          expirationTime: { $gt: new Date() },
        },
        {
          $set: { lastActivity: new Date() },
        },
      )
      .exec();

    return {
      isUpdated: result.modifiedCount > 0,
    };
  }

  private hashSessionId(sessionId: string): string {
    return createHash('sha256').update(sessionId).digest('hex');
  }

  private getSessionTtlDays(): number {
    const sessionTtlDays = Number(
      this.configService.get<string>('SESSION_TTL_DAYS') ??
        DEFAULT_SESSION_TTL_DAYS,
    );

    if (!Number.isFinite(sessionTtlDays) || sessionTtlDays <= 0) {
      throw new Error('SESSION_TTL_DAYS must be a positive number');
    }

    return sessionTtlDays;
  }
}
