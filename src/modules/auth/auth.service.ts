import bcrypt from 'bcrypt';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private sessionsService: SessionsService,
    private usersService: UsersService,
  ) {}

  async signIn({
    username,
    password,
    ipAddress,
    userAgent,
  }: {
    username: string;
    password: string;
    ipAddress: string | undefined;
    userAgent: string | undefined;
  }): Promise<{
    id: string;
    username: string;
    email: string | undefined;
    sessionId: string;
    sessionExpirationDate: Date;
  }> {
    const user = await this.usersService.findByUsernameWithPassword(username);

    // User not found
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const arePasswordsMatching = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!arePasswordsMatching) {
      // Password is not correct
      throw new UnauthorizedException('Invalid credentials');
    }

    const newSession = await this.sessionsService.create({
      userId: user.id,
      ipAddress: ipAddress,
      userAgent: userAgent,
    });

    if (!newSession) {
      throw new InternalServerErrorException('Failed to create session');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      sessionId: newSession?.sessionId,
      sessionExpirationDate: newSession?.expirationTime,
    };
  }

  async register({
    username,
    password,
    ipAddress,
    userAgent,
  }: {
    username: string;
    password: string;
    ipAddress: string | undefined;
    userAgent: string | undefined;
  }): Promise<{
    id: string;
    username: string;
    email: string | undefined;
    sessionId: string;
    sessionExpirationDate: Date;
  }> {
    const usernameNormalized = username.trim().toLowerCase();

    const existingUserWithUsername =
      await this.usersService.findByUsername(usernameNormalized);

    if (existingUserWithUsername) {
      throw new ConflictException('Username is already taken');
    }

    const newUser = await this.usersService.create(
      usernameNormalized,
      password,
    );

    if (!newUser) {
      throw new InternalServerErrorException('Failed to create user');
    }

    const newSession = await this.sessionsService.create({
      userId: newUser.id,
      ipAddress: ipAddress,
      userAgent: userAgent,
    });

    if (!newSession) {
      await this.usersService.delete(newUser.id);
      throw new InternalServerErrorException('Failed to create session');
    }

    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      sessionId: newSession.sessionId,
      sessionExpirationDate: newSession.expirationTime,
    };
  }

  async logout(sessionId: string) {
    return this.sessionsService.revokeSession(sessionId);
  }
}
