import {
  Body,
  Controller,
  InternalServerErrorException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign_in.dto';
import type { Request, Response } from 'express';
import { RegisterDto } from './dto/register.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { SignInResponseDto } from './dto/sign_in.response.dto';
import { RegisterResponseDto } from './dto/register.response.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async signIn(
    @Body() signInDto: SignInDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SignInResponseDto> {
    try {
      const result = await this.authService.signIn({
        username: signInDto.username,
        email: signInDto.email,
        password: signInDto.password,
        ipAddress: req.ip,
        userAgent: JSON.stringify(req.headers['User-Agent']),
      });
      res.cookie('sessionId', result.sessionId, {
        httpOnly: true,
        signed: true,
        sameSite: 'lax',
        secure: false,
      });
      return {
        user: {
          id: result.id,
          username: result.username,
          email: result.email,
        },
      };
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  @Public()
  @Post('register')
  async register(
    @Body() signInDto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RegisterResponseDto> {
    console.log({
      dto: signInDto,
    });
    const result = await this.authService.register({
      username: signInDto.username,
      password: signInDto.password,
      ipAddress: req.ip,
      userAgent: JSON.stringify(req.headers['User-Agent']),
    });
    res.cookie('sessionId', result.sessionId, {
      httpOnly: true,
      signed: true,
    });
    return {
      user: {
        id: result.id,
        username: result.username,
        email: result.email,
      },
    };
  }
}
