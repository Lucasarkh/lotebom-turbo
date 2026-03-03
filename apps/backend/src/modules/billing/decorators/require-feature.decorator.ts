import { SetMetadata } from '@nestjs/common';
import { FeatureCode } from '@prisma/client';

export const REQUIRED_FEATURE_KEY = 'requiredFeature';

/**
 * Decorator to mark a route as requiring a specific feature module.
 *
 * Usage:
 *   @RequireFeature(FeatureCode.AI_CHAT)
 *   @Get('chat')
 *   async chat() { ... }
 */
export const RequireFeature = (feature: FeatureCode) =>
  SetMetadata(REQUIRED_FEATURE_KEY, feature);
