import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentApiKeysService } from './agent-api-keys.service';
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto/create-api-key.dto';
import type { User } from '@prisma/client';

@ApiTags('Agent API Keys')
@ApiBearerAuth()
@Controller('agent-keys')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Roles('LOTEADORA', 'SYSADMIN')
export class AgentApiKeysController {
  constructor(private readonly service: AgentApiKeysService) {}

  @Post()
  @ApiOperation({
    summary: 'Gerar nova chave API para agentes (MCP)',
    description:
      'Cria uma chave API criptografada. A chave completa é retornada APENAS neste momento — guarde-a em local seguro.'
  })
  @ApiResponse({ status: 201, description: 'Chave criada (exibe chave completa uma vez)' })
  @ApiResponse({ status: 403, description: 'Projetos não pertencem ao tenant' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: User
  ) {
    return this.service.create(tenantId, dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar chaves API do tenant' })
  @ApiResponse({ status: 200, description: 'Lista de chaves (sem chave completa)' })
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar chave API (ativar/desativar, escopo, expiração)' })
  @ApiResponse({ status: 200, description: 'Chave atualizada' })
  @ApiResponse({ status: 404, description: 'Chave não encontrada' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateApiKeyDto
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revogar (remover permanentemente) chave API' })
  @ApiResponse({ status: 200, description: 'Chave revogada' })
  @ApiResponse({ status: 404, description: 'Chave não encontrada' })
  revoke(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.revoke(tenantId, id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Logs de auditoria de uma chave API específica' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista paginada de logs de auditoria' })
  getKeyLogs(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.service.getKeyAuditLogs(tenantId, id, {
      page: Number(page) || undefined,
      limit: Number(limit) || undefined
    });
  }

  @Get('projects/:projectId/logs')
  @ApiOperation({ summary: 'Logs de auditoria de agentes para um projeto específico' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista paginada de logs de auditoria do projeto' })
  getProjectLogs(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.service.getProjectAuditLogs(tenantId, projectId, {
      page: Number(page) || undefined,
      limit: Number(limit) || undefined
    });
  }
}
