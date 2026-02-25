import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Patch
} from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { CreateAiConfigDto, UpdateAiConfigDto } from './dto/ai-config.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { TenantGuard } from '@common/guards/tenant.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Interagir com a IA (Aberto a clientes via endpoint público se for omitida a auth, mas por agora requer auth em painel)' })
  // Note: For client usage on landing page, this should probably be public 
  // with some rate limiting and tenant verification via header/origin.
  // For now, setting up for panel testing.
  chat(
    @TenantId() tenantId: string,
    @Body() dto: ChatDto
  ) {
    return this.aiService.chat(dto, tenantId);
  }

  // --- Configuration Management ---
  @Get('configs')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Listar configurações de IA do tenant' })
  listConfigs(@TenantId() tenantId: string) {
    return this.aiService.listConfigs(tenantId);
  }

  @Post('configs')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Criar configuração de IA' })
  createConfig(@TenantId() tenantId: string, @Body() dto: CreateAiConfigDto) {
    return this.aiService.createConfig(tenantId, dto);
  }

  @Put('configs/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar configuração de IA' })
  updateConfig(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateAiConfigDto
  ) {
    return this.aiService.updateConfig(id, tenantId, dto);
  }

  @Delete('configs/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Excluir configuração de IA' })
  deleteConfig(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.aiService.deleteConfig(id, tenantId);
  }
}
