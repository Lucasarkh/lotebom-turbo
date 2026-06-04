import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  Res
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { PurchaseFlowService } from './purchase-flow.service';
import {
  CustomerConditionsConfirmationDto,
  CustomerDocumentRegistrationDto,
  CustomerDocumentUploadRequestDto,
  CustomerOtpRequestDto,
  CustomerOtpVerifyDto,
  CustomerProfileDto,
  CustomerSimulationDto,
  GenerateContractDto,
  ManualContractSignatureDto
} from './dto/purchase-flow.dto';

@ApiTags('Cliente - Purchase Flow')
@Controller('cliente')
export class PurchaseFlowCustomerController {
  constructor(private readonly service: PurchaseFlowService) {}

  @Post('otp/request')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Solicitar código OTP para acesso à área do cliente' })
  requestOtp(@Body() dto: CustomerOtpRequestDto) {
    return this.service.requestOtp(dto);
  }

  @Post('otp/verify')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @ApiOperation({ summary: 'Verificar código OTP e autenticar cliente' })
  async verifyOtp(
    @Body() dto: CustomerOtpVerifyDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.service.verifyOtp(dto);
    res.cookie(
      this.service.getAccessCookieName(),
      result.token,
      this.service.getAccessCookieOptions()
    );

    return {
      ok: true,
      expiresAt: result.expiresAt,
      reservation: result.reservation
    };
  }

  @Get('reserva-ativa')
  @ApiOperation({ summary: 'Consultar reserva ativa do cliente' })
  getActiveReservation(@Req() req: Request) {
    return this.service.getActiveReservationByAccessToken(
      req.cookies?.[this.service.getAccessCookieName()]
    );
  }

  @Get('processo-compra')
  @ApiOperation({ summary: 'Visualizar andamento do processo de compra' })
  getFlow(@Req() req: Request) {
    return this.service.getCustomerFlow(
      req.cookies?.[this.service.getAccessCookieName()]
    );
  }

  @Put('processo-compra/cadastro-cliente')
  @ApiOperation({ summary: 'Atualizar cadastro do cliente principal' })
  updateCustomer(
    @Req() req: Request,
    @Body() dto: CustomerProfileDto
  ) {
    return this.service.updatePrimaryCustomer(
      req.cookies?.[this.service.getAccessCookieName()],
      dto
    );
  }

  @Put('processo-compra/cadastro-conjuge')
  @ApiOperation({ summary: 'Atualizar cadastro do cônjuge' })
  updateSpouse(
    @Req() req: Request,
    @Body() dto: CustomerProfileDto
  ) {
    return this.service.updateSpouseCustomer(
      req.cookies?.[this.service.getAccessCookieName()],
      dto
    );
  }

  @Post('processo-compra/documentos/upload-url')
  @ApiOperation({ summary: 'Obter URL para upload de documento' })
  getDocumentUploadUrl(
    @Req() req: Request,
    @Body() dto: CustomerDocumentUploadRequestDto
  ) {
    return this.service.getCustomerDocumentUploadUrl(
      req.cookies?.[this.service.getAccessCookieName()],
      dto
    );
  }

  @Post('processo-compra/documentos')
  @ApiOperation({ summary: 'Registrar documento enviado' })
  registerDocument(
    @Req() req: Request,
    @Body() dto: CustomerDocumentRegistrationDto
  ) {
    return this.service.registerCustomerDocument(
      req.cookies?.[this.service.getAccessCookieName()],
      dto
    );
  }

  @Post('processo-compra/simulacao')
  @ApiOperation({ summary: 'Aprovar simulação de financiamento' })
  approveSimulation(
    @Req() req: Request,
    @Body() dto: CustomerSimulationDto
  ) {
    return this.service.approveSimulation(
      req.cookies?.[this.service.getAccessCookieName()],
      dto
    );
  }

  @Post('processo-compra/confirmar-condicoes')
  @ApiOperation({ summary: 'Confirmar condições de pagamento' })
  confirmConditions(
    @Req() req: Request,
    @Body() dto: CustomerConditionsConfirmationDto
  ) {
    return this.service.confirmConditions(
      req.cookies?.[this.service.getAccessCookieName()],
      dto
    );
  }

  @Post('processo-compra/gerar-contrato')
  @ApiOperation({ summary: 'Gerar contrato de compra e venda' })
  generateContract(
    @Req() req: Request,
    @Body() dto: GenerateContractDto
  ) {
    return this.service.generateContract(
      req.cookies?.[this.service.getAccessCookieName()],
      dto
    );
  }

  @Post('processo-compra/assinar-contrato')
  @ApiOperation({ summary: 'Assinar contrato eletronicamente' })
  signContract(
    @Req() req: Request,
    @Body() dto: ManualContractSignatureDto
  ) {
    return this.service.signContract(
      req.cookies?.[this.service.getAccessCookieName()],
      dto
    );
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout do cliente' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(
      this.service.getAccessCookieName(),
      this.service.getAccessCookieOptions()
    );
    return { ok: true };
  }
}