import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import type { Request, Response } from 'express';
import { RegisterDto } from './dto/register.dto';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Public()
    @Post('login')
    async signIn(
        @Body() signInDto: SignInDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.signIn({
            username: signInDto.username,
            email: signInDto.email,
            password: signInDto.password,
            ipAddress: req.ip,
            userAgent: JSON.stringify(req.headers['User-Agent']),
        });
        if (result) {
            res.cookie('sessionId', result, {
                httpOnly: true,
                signed: true,
                secure: true,
            })
        }
    }

    @Public()
    @Post('register')
    async register(
        @Body() signInDto: RegisterDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.register({
            username: signInDto.username,
            password: signInDto.password,
            ipAddress: req.ip,
            userAgent: JSON.stringify(req.headers['User-Agent']),
        });
        if (result) {
            res.cookie('sessionId', result, {
                httpOnly: true,
                signed: true,
                secure: true,
            })
        }
    }
}
