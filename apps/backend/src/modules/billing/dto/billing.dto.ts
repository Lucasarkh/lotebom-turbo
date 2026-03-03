import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeatureCode } from '@prisma/client';

// ─── SysAdmin: Manage Tenant Features ────────────────────

export class FeatureItemDto {
  @ApiProperty({ enum: FeatureCode })
  @IsEnum(FeatureCode)
  featureCode: FeatureCode;

  @ApiPropertyOptional({ description: 'Custom price in cents for this tenant' })
  @IsOptional()
  @IsInt()
  @Min(0)
  customPriceCents?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTenantFeaturesDto {
  @ApiProperty({ type: [FeatureItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeatureItemDto)
  features: FeatureItemDto[];

  @ApiPropertyOptional({ description: 'Combo ID to associate with this subscription' })
  @IsOptional()
  @IsString()
  comboId?: string | null;
}

export class SetBillingAnchorDto {
  @ApiProperty({ description: 'Dia do mês para vencimento (1-28)', example: 10 })
  @IsInt()
  @Min(1)
  @Max(28)
  billingDay: number;
}

// ─── Customer Setup ──────────────────────────────────────

export class CreateCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}

export class SavePaymentMethodDto {
  @ApiProperty({ description: 'Stripe PaymentMethod ID (pm_xxx)' })
  @IsString()
  paymentMethodId: string;
}

// ─── Checkout ────────────────────────────────────────────

export class CreateCheckoutDto {
  @ApiPropertyOptional({ description: 'Success redirect URL' })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({ description: 'Cancel redirect URL' })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

// ─── Feature Catalog (SysAdmin) ──────────────────────────

export class UpsertFeatureCatalogDto {
  @ApiProperty({ enum: FeatureCode })
  @IsEnum(FeatureCode)
  code: FeatureCode;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Default monthly price in cents' })
  @IsInt()
  @Min(0)
  defaultPriceCents: number;
}

// ─── Response DTOs ───────────────────────────────────────

export class SubscriptionStatusDto {
  tenantId: string;
  tenantName: string;
  billingStatus: string;
  stripeCustomerId: string | null;
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  features: {
    featureCode: string;
    isActive: boolean;
    customPriceCents: number | null;
    catalogName: string;
  }[];
  totalMonthlyCents: number;
  gracePeriodEnd: Date | null;
  combo?: { id: string; name: string; description?: string; discountPercent: number } | null;
}

// ─── Feature Combo DTOs ─────────────────────────────────

export class ComboItemDto {
  @ApiProperty({ enum: FeatureCode })
  @IsEnum(FeatureCode)
  featureCode: FeatureCode;

  @ApiPropertyOptional({ description: 'Override price in cents within this combo' })
  @IsOptional()
  @IsInt()
  @Min(0)
  overridePriceCents?: number;
}

export class UpsertFeatureComboDto {
  @ApiPropertyOptional({ description: 'Combo ID (for update). Omit to create new.' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Combo display name' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Discount percentage 0-100', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiProperty({ type: [ComboItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  items: ComboItemDto[];
}

export class ApplyComboDto {
  @ApiProperty({ description: 'Combo ID to apply' })
  @IsString()
  comboId: string;
}
