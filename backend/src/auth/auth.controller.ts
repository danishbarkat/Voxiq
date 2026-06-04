import { Body, Controller, Post, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { Public } from './decorators/public.decorator';
import { SetMetadata } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ short: { ttl: 60000, limit: 5 } })  // 5 signups/min per IP
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @Throttle({ short: { ttl: 60000, limit: 10 } })  // 10 verify attempts/min
  @Post('signup/verify')
  verifySignup(@Body('email') email: string, @Body('code') code: string) {
    return this.authService.verifySignup(email, code);
  }

  @Public()
  @Throttle({ short: { ttl: 60000, limit: 10 } })  // 10 login attempts/min
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.loginWithMfa(dto.email, dto.password, dto.accessCode);
  }

  @Public()
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  @Post('mfa/verify')
  verifyMfa(@Body('mfaToken') mfaToken: string, @Body('code') code: string) {
    return this.authService.verifyMfa(mfaToken, code);
  }

  @SkipThrottle()
  @Get('profile')
  @SetMetadata('allowInactiveAccount', true)
  getProfile(@Req() req: any) {
    return req.user;
  }

  @Public()
  @Throttle({ short: { ttl: 60000, limit: 3 } })   // 3 forgot-password/min
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
