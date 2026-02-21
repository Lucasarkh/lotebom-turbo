import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts tenantId from the request (set by TenantGuard or JWT payload).
 * Usage: @TenantId() tenantId: string
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId || request.user?.tenantId;
  },
);
