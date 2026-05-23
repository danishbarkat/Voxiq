import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    if (dto.adminCode !== process.env.ADMIN_SIGNUP_CODE) {
      throw new ForbiddenException('Invalid admin code');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    let adminRole = await this.prisma.role.findFirst({
      where: { name: { equals: 'Admin', mode: 'insensitive' } },
    });
    if (!adminRole) {
      adminRole = await this.prisma.role.create({ data: { name: 'Admin' } });
    }

    const account = await this.prisma.account.create({
      data: {
        name: dto.companyName,
        status: AccountStatus.PENDING,
        approved: false,
        requestedAgentLimit: dto.requestedAgentLimit,
        requestedNumbers: dto.requestedNumbers,
        adminPhone: dto.phone,
      },
    });

    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.create({
      data: {
        name: `${dto.name} ${dto.lastName}`.trim(),
        email: dto.email.toLowerCase(),
        passwordHash,
        roleId: adminRole.id,
        accountId: account.id,
      },
    });

    return {
      message:
        'Signup successful. Your account is under review. You will be able to login once approved.',
    };
  }

  async validateUser(email: string, password: string) {
    console.log(`Validating user: ${email}`);
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { role: true, account: { select: { status: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.account?.status === AccountStatus.PENDING) {
      throw new ForbiddenException('Account pending approval');
    }
    if (user.account?.status === AccountStatus.INACTIVE) {
      throw new ForbiddenException('Account deactivated');
    }

    const { passwordHash, account, ...safeUser } = user as any;
    return safeUser;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      role: user.role?.name,
      accountId: user.accountId,
      teamId: user.teamId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role?.name,
        accountId: user.accountId,
        teamId: user.teamId,
        status: user.status,
        createdAt: user.createdAt,
      },
    };
  }
}
