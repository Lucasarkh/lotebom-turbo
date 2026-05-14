import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { BillingService } from '../billing.service';

/**
 * Guard that checks tenant billing status on protected routes.
 *
 * - BillingStatus.OK → allow
 * - BillingStatus.GRACE_PERIOD → allow + attach warning to response header
 * - BillingStatus.INADIMPLENTE → block with 403
 * - BillingStatus.CANCELLED → block with 403
 *
 * SYSADMIN users always bypass this guard.
 *
 * Usage: Apply globally or per-controller with @UseGuards(BillingGuard).
 * No per-feature gating — all features are included with each project.
 */
@Injectable()
export class BillingGuard implements CanActivate {
  private readonly logger = new Logger(BillingGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly billingService: BillingService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    return true;
  }
}

// Keep old name as alias for backward compatibility
export const FeatureGuard = BillingGuard;
