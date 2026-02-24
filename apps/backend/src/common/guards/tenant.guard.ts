import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * TenantGuard ensures that the authenticated user's tenantId
 * is injected into the request and that tenant isolation is enforced.
 * Must be used AFTER AuthGuard('jwt').
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    if (user.role === UserRole.SYSADMIN) {
      // Sysadmins can access any tenant but might need to specify one
      // in query params or headers if needed. For global actions, no tenantId.
      request.tenantId =
        request.query.tenantId || request.headers['x-tenant-id'];
      return true;
    }

    if (!user.tenantId) {
      throw new ForbiddenException('Usuário não associado a um tenant.');
    }

    // Inject tenantId into the request for easy access
    request.tenantId = user.tenantId;

    return true;
  }
}
