import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import type { Request, Response } from 'express';
import { RegisterDto } from './dto/register.dto';
import { SignInResponseDto } from './dto/sign-in.response.dto';
import { RegisterResponseDto } from './dto/register.response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { getCookieSameSite, getCookieSecure } from '../../config/app.config';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() signInDto: SignInDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SignInResponseDto> {
    const result = await this.authService.signIn({
      username: signInDto.username,
      password: signInDto.password,
      ipAddress: req.ip,
      userAgent: JSON.stringify(req.headers['user-agent']),
    });

    this.setSessionCookie(res, result.sessionId, result.sessionExpirationDate);

    return {
      user: {
        id: result.id,
        username: result.username,
        email: result.email,
      },
    };
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() signInDto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RegisterResponseDto> {
    const result = await this.authService.register({
      username: signInDto.username,
      password: signInDto.password,
      ipAddress: req.ip,
      userAgent: JSON.stringify(req.headers['user-agent']),
    });

    this.setSessionCookie(res, result.sessionId, result.sessionExpirationDate);

    return {
      user: {
        id: result.id,
        username: result.username,
        email: result.email,
      },
    };
  }

  @Delete('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessionId = req.signedCookies['sessionId'] as string | undefined;
    if (!sessionId) {
      return;
    }
    await this.authService.logout(sessionId);
    this.clearSessionCookie(res);
  }

  private setSessionCookie(
    res: Response,
    sessionId: string,
    expires: Date,
  ): void {
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      signed: true,
      sameSite: getCookieSameSite(),
      secure: getCookieSecure(),
      expires,
      path: '/',
    });
  }

  private clearSessionCookie(res: Response): void {
    res.cookie('sessionId', '', {
      httpOnly: true,
      signed: true,
      sameSite: getCookieSameSite(),
      secure: getCookieSecure(),
      expires: new Date(0),
      path: '/',
    });
  }
}
