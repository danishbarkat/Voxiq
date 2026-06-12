"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    prisma;
    constructor(configService, prisma) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET'),
        });
        this.prisma = prisma;
    }
    async validate(payload) {
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
        if (!user || !user.account) {
            throw new common_1.UnauthorizedException('Account no longer exists');
        }
        if (user.lastSessionId && payload.sessionId !== user.lastSessionId) {
            throw new common_1.UnauthorizedException('Session expired — logged in from another browser');
        }
        if (user.status === 'INACTIVE') {
            throw new common_1.UnauthorizedException('Your account has been deactivated');
        }
        const roleName = user.role?.name?.toLowerCase() || '';
        const accountStatus = user.account.status;
        if (accountStatus === 'PENDING') {
            throw new common_1.UnauthorizedException('Account pending approval');
        }
        if (accountStatus === 'INACTIVE' && roleName !== 'admin' && roleName !== 'superadmin') {
            throw new common_1.UnauthorizedException('Company account is deactivated. Contact your admin.');
        }
        return {
            userId: payload.sub,
            role: payload.role,
            accountId: payload.accountId,
            teamId: payload.teamId,
            accountStatus,
        };
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map