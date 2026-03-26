import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { Session } from './schemas/session.schema';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';

@Injectable()
export class SessionsService {
    constructor(@InjectModel(Session.name) private sessionModel: Model<Session>) { }

    async create({
        userId,
        ipAddress,
        userAgent
    }: {
        userId: string;
        ipAddress: string;
        userAgent: string
    }): Promise<String> {
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
        return newSession.sessionId;
    }

    async findSession(sessionId: string): Promise<Session | null> {
        const session = await this.sessionModel.findOne({ sessionId }).exec();
        return session;
    }

    async revokeSession(sessionId: string): Promise<void> {
        await this.sessionModel.findByIdAndUpdate({ sessionId }, { isRevoked: true }).exec();
    }

    async deleteSession(sessionId: string): Promise<void> {
        await this.sessionModel.findByIdAndDelete({ sessionId }).exec();
    }
}
