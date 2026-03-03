import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BillingService } from './billing.service';
import {
  UpdateTenantFeaturesDto,
  SetBillingAnchorDto,
  CreateCustomerDto,
  SavePaymentMethodDto,
  CreateCheckoutDto,
  UpsertFeatureCatalogDto,
  UpsertFeatureComboDto,
  ApplyComboDto,
} from './dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { TenantId } from '@/common/decorators/tenant-id.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';

// ─── SYSADMIN BILLING CONTROLLER ──────────────────────────

@ApiTags('Billing - Admin')
@ApiBearerAuth()
@Controller('billing/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSADMIN)
export class BillingAdminController {
  constructor(private readonly billingService: BillingService) {}

  // ─── Feature Catalog ────────────────────────────────────

  @Post('catalog')
  @ApiOperation({ summary: 'Create/update a feature in the catalog' })
  upsertCatalog(@Body() dto: UpsertFeatureCatalogDto) {
    return this.billingService.upsertFeatureCatalog(dto);
  }

  @Get('catalog')
  @ApiOperation({ summary: 'List all features in the catalog' })
  listCatalog() {
    return this.billingService.listFeatureCatalog();
  }

  // ─── Tenant Feature Management ──────────────────────────

  @Put('tenants/:tenantId/features')
  @ApiOperation({ summary: 'Set features + custom prices for a tenant' })
  updateFeatures(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateTenantFeaturesDto,
  ) {
    return this.billingService.updateTenantFeatures(tenantId, dto);
  }

  @Get('tenants/:tenantId/subscription')
  @ApiOperation({ summary: 'Get subscription status for a tenant' })
  getSubscription(@Param('tenantId') tenantId: string) {
    return this.billingService.getSubscriptionStatus(tenantId);
  }

  @Put('tenants/:tenantId/billing-anchor')
  @ApiOperation({ summary: 'Set custom billing date for a tenant' })
  setBillingAnchor(
    @Param('tenantId') tenantId: string,
    @Body() dto: SetBillingAnchorDto,
  ) {
    return this.billingService.setBillingAnchor(tenantId, dto.billingDay);
  }

  @Post('tenants/:tenantId/customer')
  @ApiOperation({ summary: 'Create/ensure Stripe customer for tenant' })
  ensureCustomer(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.billingService.ensureStripeCustomer(tenantId, dto);
  }

  @Get('tenants/:tenantId/invoices')
  @ApiOperation({ summary: 'List invoices for a tenant' })
  listInvoices(@Param('tenantId') tenantId: string) {
    return this.billingService.listInvoices(tenantId);
  }

  @Post('tenants/:tenantId/fix-payment-methods')
  @ApiOperation({ summary: 'Fix subscription payment methods (enable boleto)' })
  fixPaymentMethods(@Param('tenantId') tenantId: string) {
    return this.billingService.fixSubscriptionPaymentMethods(tenantId);
  }

  // ─── Feature Combos ─────────────────────────────────────

  @Post('combos')
  @ApiOperation({ summary: 'Create or update a feature combo' })
  upsertCombo(@Body() dto: UpsertFeatureComboDto) {
    return this.billingService.upsertFeatureCombo(dto);
  }

  @Get('combos')
  @ApiOperation({ summary: 'List all active feature combos' })
  listCombos() {
    return this.billingService.listFeatureCombos();
  }

  @Delete('combos/:comboId')
  @ApiOperation({ summary: 'Deactivate a feature combo' })
  deleteCombo(@Param('comboId') comboId: string) {
    return this.billingService.deleteFeatureCombo(comboId);
  }

  @Post('tenants/:tenantId/apply-combo')
  @ApiOperation({ summary: 'Apply a feature combo to a tenant' })
  applyCombo(
    @Param('tenantId') tenantId: string,
    @Body() dto: ApplyComboDto,
  ) {
    return this.billingService.applyComboToTenant(tenantId, dto.comboId);
  }
}

// ─── TENANT BILLING CONTROLLER (self-service) ─────────────

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get my subscription status' })
  getMyStatus(@TenantId() tenantId: string) {
    return this.billingService.getSubscriptionStatus(tenantId);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List my invoices' })
  getMyInvoices(@TenantId() tenantId: string) {
    return this.billingService.listInvoices(tenantId);
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'List saved payment methods' })
  listMethods(@TenantId() tenantId: string) {
    return this.billingService.listPaymentMethods(tenantId);
  }

  @Post('payment-methods')
  @ApiOperation({ summary: 'Save a new payment method' })
  saveMethod(
    @TenantId() tenantId: string,
    @Body() dto: SavePaymentMethodDto,
  ) {
    return this.billingService.savePaymentMethod(tenantId, dto);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Create checkout session to add payment method' })
  createCheckout(
    @TenantId() tenantId: string,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.billingService.createCheckoutSession(
      tenantId,
      dto.successUrl,
      dto.cancelUrl,
    );
  }

  @Post('portal')
  @ApiOperation({ summary: 'Create billing portal session' })
  createPortal(@TenantId() tenantId: string) {
    return this.billingService.createPortalSession(tenantId);
  }
}

// ─── STRIPE WEBHOOK CONTROLLER ────────────────────────────

@ApiTags('Billing - Webhooks')
@Controller('billing/webhooks')
export class BillingWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post('stripe')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async handleStripeWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody as Buffer;
    if (!rawBody) {
      throw new Error('Raw body not available. Ensure raw body parsing is enabled.');
    }
    return this.billingService.handleWebhook(rawBody, signature);
  }
}
