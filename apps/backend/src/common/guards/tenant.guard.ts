import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

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

    if (!user.tenantId) {
      throw new ForbiddenException('Usuário não associado a um tenant.');
    }

    // Inject tenantId into the request for easy access
    request.tenantId = user.tenantId;

    return true;
  }
}
