import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Criar usuário no tenant' })
  create(@TenantId() tenantId: string, @Body() dto: CreateUserDto) {
    return this.userService.create(tenantId, dto);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar usuários do tenant' })
  findAll(
    @TenantId() tenantId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.userService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.userService.findById(tenantId, id);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualizar usuário' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remover usuário' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.userService.remove(tenantId, id);
  }
}
