import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtAccessPayload } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtAccessPayload | undefined;

    if (!user) {
      return false;
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      include: { roles: true },
    });

    if (!dbUser || !dbUser.isActive) {
      return false;
    }

    const userRoles = dbUser.roles.map((r) => r.name);
    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
