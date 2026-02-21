import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'Residencial Parque dos Ipês v2' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'parque-dos-ipes-v2' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'Nova descrição do loteamento.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'http://example.com/map.png' })
  @IsOptional()
  @IsString()
  mapBaseImageUrl?: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'Dados do mapa do editor (JSON)' })
  @IsOptional()
  mapData?: any;

  @ApiPropertyOptional({ description: 'Destaques/diferenciais do loteamento [{icon, label, value}]' })
  @IsOptional()
  highlightsJson?: any;

  @ApiPropertyOptional({ description: 'Exibe tabela de condições de pagamento nas páginas públicas' })
  @IsOptional()
  showPaymentConditions?: boolean;

  @ApiPropertyOptional({ description: 'Texto de localização e infraestrutura do entorno' })
  @IsOptional()
  @IsString()
  locationText?: string;
}
