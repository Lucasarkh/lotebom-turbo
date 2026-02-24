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
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { AuthGuard } from '@nestjs/passport';

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
  @ApiOperation({ summary: 'Cadastro de loteadora (cria tenant + admin user)' })
  async registerTenant(@Body() dto: RegisterTenantDto) {
    return this.authService.registerTenant(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login de usuário' })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return this.authService.login(user);
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

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dados do usuário autenticado' })
  async me(@Request() req: any) {
    return this.authService.me(req.user.id);
  }
}
