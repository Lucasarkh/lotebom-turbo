import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureCode, UserRole } from '@prisma/client';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { REQUIRED_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { BillingService } from '../billing.service';

/**
 * Guard that checks:
 * 1. If the route requires a specific feature (@RequireFeature decorator)
 * 2. If the tenant has that feature active
 * 3. If the tenant billing status allows access
 *
 * - BillingStatus.OK → allow
 * - BillingStatus.GRACE_PERIOD → allow + attach warning to response header
 * - BillingStatus.INADIMPLENTE → block with 403
 * - BillingStatus.CANCELLED → block with 403
 *
 * SYSADMIN users always bypass this guard.
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  private readonly logger = new Logger(FeatureGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly billingService: BillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Check if route requires a feature
    const requiredFeature = this.reflector.getAllAndOverride<FeatureCode>(
      REQUIRED_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredFeature) return true; // No feature requirement → allow

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const user = request.user;

    // SYSADMIN bypasses all feature checks
    if (user?.role === UserRole.SYSADMIN) return true;

    const tenantId = request.tenantId || user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant não identificado.');
    }

    const access = await this.billingService.checkFeatureAccess(
      tenantId,
      requiredFeature,
    );

    if (!access.allowed) {
      throw new ForbiddenException(
        access.reason || `Módulo ${requiredFeature} não disponível.`,
      );
    }

    // If in grace period, attach warning header so frontend can display alert
    if (access.warning) {
      response.setHeader('X-Billing-Warning', access.reason || 'Pagamento pendente');
      response.setHeader('X-Billing-Status', 'GRACE_PERIOD');
    }

    return true;
  }
}
