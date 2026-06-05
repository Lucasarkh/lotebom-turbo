import { IsString, IsOptional, IsArray, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'Nome descritivo da chave' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'IDs dos projetos que a chave pode acessar (vazio = todos)' })
  @IsArray()
  @IsOptional()
  projectIds?: string[];

  @ApiPropertyOptional({ description: 'Lista de permissões (ex: ["projects:read","lots:write"])' })
  @IsArray()
  @IsOptional()
  permissions?: string[];

  @ApiPropertyOptional({ description: 'Data de expiração (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class UpdateApiKeyDto {
  @ApiPropertyOptional({ description: 'Ativar/desativar chave' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'IDs dos projetos que a chave pode acessar' })
  @IsArray()
  @IsOptional()
  projectIds?: string[];

  @ApiPropertyOptional({ description: 'Lista de permissões' })
  @IsArray()
  @IsOptional()
  permissions?: string[];

  @ApiPropertyOptional({ description: 'Data de expiração (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
