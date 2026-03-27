import { Headers, Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    signIn(
        @Body() signInDto: SignInDto,
        @Req() req: Request,
    ) {
        return this.authService.signIn({
            username: signInDto.username,
            email: signInDto.email,
            password: signInDto.password,
            ipAddress: req.ip,
            userAgent: JSON.stringify(req.headers['User-Agent']),
        });
    }
}
