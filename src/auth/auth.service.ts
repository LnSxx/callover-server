import bcrypt from "bcrypt";
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { SessionsService } from 'src/sessions/sessions.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
    constructor(
        private sessionsService: SessionsService,
        private usersService: UsersService,
    ) { }

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
    }
    ): Promise<string> {
        const user = await this.usersService.findBy(username, email);

        // User not found
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check password 
        const arePasswordsMatching = await bcrypt.compare(password, user.passwordHash);

        if (!arePasswordsMatching) {
            // Password is not correct
            throw new UnauthorizedException('Invalid credentials');
        }

        const newSessionId = await this.sessionsService.create({
            userId: user.id,
            ipAddress: ipAddress,
            userAgent: userAgent,
        })

        return newSessionId;
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
    }): Promise<string> {
        const existingUserWithUsername = await this.usersService.findBy(username);

        if (existingUserWithUsername) {
            // User with given username exists in database
            throw new BadRequestException('Username is taken');
        }

        const newUser = await this.usersService.create({ username, password });

        const newSessionId = await this.sessionsService.create({
            userId: newUser.id,
            ipAddress: ipAddress,
            userAgent: userAgent,
        })

        return newSessionId;
    }
}
