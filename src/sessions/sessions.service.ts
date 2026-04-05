import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { Session } from './schemas/session.schema';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<Session>,
  ) {}

  async create({
    userId,
    ipAddress,
    userAgent,
  }: {
    userId: string;
    ipAddress: string | undefined;
    userAgent: string | undefined;
  }): Promise<Session | null> {
    const sessionId = randomBytes(32).toString('hex');
    const newSession = new this.sessionModel({
      sessionId,
      userId,
      ipAddress,
      userAgent,
      lastActivity: new Date(),
      isRevoked: false,
      expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });
    await newSession.save();
    return newSession;
  }

  async findSession(sessionId: string): Promise<Session | null> {
    const session = await this.sessionModel
      .findOne({
        sessionId,
        isRevoked: false,
        expirationTime: { $gt: new Date() },
      })
      .exec();
    return session;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionModel
      .findOneAndUpdate({ sessionId }, { isRevoked: true })
      .exec();
  }

  async revokeAllSessionsForUserId(userId: string): Promise<void> {
    await this.sessionModel.updateMany({ userId }, { isRevoked: true }).exec();
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.sessionModel.findOneAndDelete({ sessionId }).exec();
  }

  async deleteAllSessionsForUserId(userId: string): Promise<void> {
    await this.sessionModel.deleteMany({ userId }).exec();
  }

  async updateActivity(sessionId: string) {
    await this.sessionModel
      .updateOne({ sessionId }, { lastActivity: new Date() })
      .exec();
  }
}
