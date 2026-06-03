import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const allowInactiveAccount =
      this.reflector.getAllAndOverride<boolean>('allowInactiveAccount', [
        context.getHandler(),
        context.getClass(),
      ]) || false;

    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>('roles', [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user?.role) {
      throw new ForbiddenException('Role not found on user');
    }

    const userRole = (user.role || '').toString().toLowerCase().trim();
    const accountStatus = (user.accountStatus || '').toString().toUpperCase().trim();

    if (accountStatus === 'INACTIVE' && userRole !== 'superadmin' && !allowInactiveAccount) {
      throw new ForbiddenException('Account is inactive');
    }
    
    // SuperAdmin bypasses all role checks
    if (userRole === 'superadmin') {
      return true;
    }

    if (!requiredRoles.some(role => role.toLowerCase().trim() === userRole)) {
      throw new ForbiddenException(`Insufficient role: ${userRole}`);
    }
    return true;
  }
}
