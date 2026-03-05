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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  async checkTenantSlug(@Param('slug') slug: string) {
    return this.authService.checkTenantSlugAvailability(slug);
  }

  @Post('register-tenant')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // Somente 3 registros por minuto por IP
  @ApiOperation({ summary: 'Registrar nova loteadora (tenant + admin)' })
  async registerTenant(@Body() dto: RegisterTenantDto) {
    return this.authService.registerTenant(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Limite estrito de login para evitar brute-force
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login de usuário' })
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
  async verifyTwoFactor(@Body() dto: any) {
    return this.authService.verifyTwoFactor(dto.userId, dto.code);
  }

  @Post('toggle-2fa')
  @UseGuards(AuthGuard('jwt'))
  @SkipTermsCheck()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ativar/desativar 2FA' })
  async toggleTwoFactor(@Request() req: any, @Body() dto: any) {
    return this.authService.toggleTwoFactor(req.user.id, dto.enabled);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto.id, refreshDto.refresh_token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout' })
  async logout(@Body() logoutDto: LogoutDto) {
    return this.authService.logout(logoutDto.id);
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @SkipTermsCheck()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Alterar senha do usuário logado' })
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
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redefinição de senha com token' })
  async resetPassword(@Body() dto: any) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @SkipTermsCheck()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dados do usuário autenticado' })
  async me(@Request() req: any) {
    return this.authService.me(req.user.id);
  }

  @Post('accept-terms')
  @UseGuards(AuthGuard('jwt'))
  @SkipTermsCheck()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aceitar termos de uso e política de privacidade' })
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
  async termsStatus(@Request() req: any) {
    return this.authService.getTermsStatus(req.user.id);
  }
}
