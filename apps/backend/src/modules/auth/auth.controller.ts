import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { AuthGuard } from '@nestjs/passport';
import { SkipTermsCheck } from '@/common/decorators/skip-terms-check.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('check-tenant-slug/:slug')
  @ApiOperation({ summary: 'Verificar disponibilidade de slug de tenant' })
  @ApiResponse({ status: 200, description: 'Disponibilidade do slug' })
  @ApiResponse({ status: 400, description: 'Slug inválido' })
  async checkTenantSlug(@Param('slug') slug: string) {
    return this.authService.checkTenantSlugAvailability(slug);
  }

  @Post('register-tenant')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // Somente 3 registros por minuto por IP
  @ApiOperation({ summary: 'Registrar nova loteadora (tenant + admin)' })
  @ApiResponse({ status: 201, description: 'Loteadora e administrador criados com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'E-mail ou slug já em uso' })
  async registerTenant(@Body() dto: RegisterTenantDto) {
    return this.authService.registerTenant(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Limite estrito de login para evitar brute-force
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login de usuário' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso. Pode incluir requiresTwoFactor.' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password
    );
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return this.authService.login(user);
  }

  @Post('verify-2fa')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar código 2FA' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'code'],
      properties: {
        userId: { type: 'string', description: 'ID do usuário', example: 'clx2abc...' },
        code: { type: 'string', description: 'Código de 6 dígitos enviado por e-mail', example: '123456' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Código verificado, tokens emitidos' })
  @ApiResponse({ status: 400, description: 'Código expirado ou nenhum pendente' })
  @ApiResponse({ status: 401, description: 'Código inválido ou usuário não encontrado' })
  async verifyTwoFactor(@Body() dto: any) {
    return this.authService.verifyTwoFactor(dto.userId, dto.code);
  }

  @Post('toggle-2fa')
  @UseGuards(AuthGuard('jwt'))
  @SkipTermsCheck()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ativar/desativar 2FA' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['enabled'],
      properties: {
        enabled: { type: 'boolean', description: 'true para ativar, false para desativar', example: true },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Configuração 2FA atualizada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async toggleTwoFactor(@Request() req: any, @Body() dto: any) {
    return this.authService.toggleTwoFactor(req.user.id, dto.enabled);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Novo access token gerado' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido ou expirado' })
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto.id, refreshDto.refresh_token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout' })
  @ApiResponse({ status: 200, description: 'Logout realizado com sucesso' })
  @ApiResponse({ status: 400, description: 'ID do usuário inválido' })
  async logout(@Body() logoutDto: LogoutDto) {
    return this.authService.logout(logoutDto.id);
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @SkipTermsCheck()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Alterar senha do usuário logado' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['currentPassword', 'newPassword'],
      properties: {
        currentPassword: { type: 'string', description: 'Senha atual', example: 'senhaAtual123' },
        newPassword: { type: 'string', description: 'Nova senha (deve atender à política de segurança)', example: 'novaSenhaSegura456' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso' })
  @ApiResponse({ status: 400, description: 'Nova senha não atende à política de segurança' })
  @ApiResponse({ status: 401, description: 'Senha atual incorreta ou não autenticado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async changePassword(@Request() req: any, @Body() dto: any) {
    return this.authService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword
    );
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar redefinição de senha' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email', description: 'E-mail cadastrado', example: 'usuario@exemplo.com' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Se o e-mail existir, link de redefinição enviado' })
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redefinição de senha com token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token', 'password'],
      properties: {
        token: { type: 'string', description: 'Token de redefinição enviado por e-mail', example: 'abc123...' },
        password: { type: 'string', description: 'Nova senha (deve atender à política de segurança)', example: 'novaSenhaSegura789' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Senha redefinida com sucesso' })
  @ApiResponse({ status: 400, description: 'Token inválido, expirado ou senha fraca' })
  async resetPassword(@Body() dto: any) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @SkipTermsCheck()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dados do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  @ApiResponse({ status: 401, description: 'Não autenticado ou usuário não encontrado' })
  async me(@Request() req: any) {
    return this.authService.me(req.user.id);
  }

  @Post('accept-terms')
  @UseGuards(AuthGuard('jwt'))
  @SkipTermsCheck()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aceitar termos de uso e política de privacidade' })
  @ApiResponse({ status: 200, description: 'Termos aceitos com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async acceptTerms(@Request() req: any) {
    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.ip ||
      'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.acceptTerms(req.user.id, ipAddress, userAgent);
  }

  @Get('terms-status')
  @UseGuards(AuthGuard('jwt'))
  @SkipTermsCheck()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar status de aceite dos termos' })
  @ApiResponse({ status: 200, description: 'Status de aceite dos termos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async termsStatus(@Request() req: any) {
    return this.authService.getTermsStatus(req.user.id);
  }
}
