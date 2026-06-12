import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  role?: string;
  accountId?: string;
  teamId?: string | null;
  accountStatus?: string | null;
  sessionId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Real-time DB check — catches deleted/deactivated accounts immediately
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        status: true,
        lastSessionId: true,
        account: { select: { id: true, status: true } },
        role: { select: { name: true } },
      },
    });

    // User deleted or account deleted
    if (!user || !user.account) {
      throw new UnauthorizedException('Account no longer exists');
    }

    // Single-session enforcement: if DB has a sessionId, only the matching token is valid
    // Also rejects old tokens (no sessionId) once a new login has set lastSessionId
    if (user.lastSessionId && payload.sessionId !== user.lastSessionId) {
      throw new UnauthorizedException('Session expired — logged in from another browser');
    }

    // User deactivated
    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException('Your account has been deactivated');
    }

    const roleName = user.role?.name?.toLowerCase() || '';
    const accountStatus = user.account.status;

    // Account deleted/pending — nobody in
    if (accountStatus === 'PENDING') {
      throw new UnauthorizedException('Account pending approval');
    }

    // Account INACTIVE — only admin can access (for reactivation request), agents blocked
    if (accountStatus === 'INACTIVE' && roleName !== 'admin' && roleName !== 'superadmin') {
      throw new UnauthorizedException('Company account is deactivated. Contact your admin.');
    }

    return {
      userId: payload.sub,
      role: payload.role,
      accountId: payload.accountId,
      teamId: payload.teamId,
      accountStatus,
    };
  }
}
