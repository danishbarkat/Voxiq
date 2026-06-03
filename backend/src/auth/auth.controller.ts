import { Body, Controller, Post, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { Public } from './decorators/public.decorator';
import { SetMetadata } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @Post('signup/verify')
  verifySignup(@Body('email') email: string, @Body('code') code: string) {
    return this.authService.verifySignup(email, code);
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.loginWithMfa(dto.email, dto.password, dto.accessCode);
  }

  @Public()
  @Post('mfa/verify')
  verifyMfa(@Body('mfaToken') mfaToken: string, @Body('code') code: string) {
    return this.authService.verifyMfa(mfaToken, code);
  }

  @Get('profile')
  @SetMetadata('allowInactiveAccount', true)
  getProfile(@Req() req: any) {
    return req.user;
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Get('reset-requests')
  getPasswordResetRequests(@Req() req: any) {
    return this.authService.getPasswordResetRequests(req.user?.accountId);
  }

  @Post('reactivation-request')
  @SetMetadata('allowInactiveAccount', true)
  requestReactivation(@Req() req: any, @Body('message') message?: string) {
    return this.authService.requestReactivation(req.user, message);
  }
}
