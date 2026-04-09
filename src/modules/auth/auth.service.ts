import bcrypt from 'bcrypt';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionsService } from 'src/modules/sessions/sessions.service';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private sessionsService: SessionsService,
    private usersService: UsersService,
  ) {}

  async signIn({
    username,
    email,
    password,
    ipAddress,
    userAgent,
  }: {
    username: string | undefined;
    email: string | undefined;
    password: string;
    ipAddress: string | undefined;
    userAgent: string | undefined;
  }): Promise<{
    id: string;
    username: string;
    email: string | undefined;
    sessionId: string | undefined;
    sessionExpirationDate: Date | undefined;
  }> {
    const user = await this.usersService.findBy(username, email);

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
    sessionId: string | undefined;
    sessionExpirationDate: Date | undefined;
  }> {
    const existingUserWithUsername = await this.usersService.findBy(username);

    if (existingUserWithUsername) {
      // User with given username exists in database
      throw new BadRequestException('Username is taken');
    }

    const newUser = await this.usersService.create({ username, password });

    const newSession = await this.sessionsService.create({
      userId: newUser.id,
      ipAddress: ipAddress,
      userAgent: userAgent,
    });

    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      sessionId: newSession?.sessionId,
      sessionExpirationDate: newSession?.expirationTime,
    };
  }

  async logout(sessionId: string) {
    return this.sessionsService.revokeSession(sessionId);
  }
}
