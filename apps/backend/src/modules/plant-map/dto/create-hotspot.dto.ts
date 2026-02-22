import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  LotStatus,
  PlantHotspotLinkType,
  PlantHotspotType,
} from '@prisma/client';

export class CreateHotspotDto {
  @ApiProperty({ enum: PlantHotspotType, example: 'LOTE' })
  @IsEnum(PlantHotspotType)
  type: PlantHotspotType;

  @ApiProperty({ example: 'Lote 12' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Terreno de 300m²' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Posição X normalizada [0..1]', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  x: number;

  @ApiProperty({ description: 'Posição Y normalizada [0..1]', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  y: number;

  @ApiPropertyOptional({ description: 'Rótulo exibido sobre o pino (ex: L-12)' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  labelEnabled?: boolean;

  @ApiPropertyOptional({ default: 0, description: 'Offset X do rótulo em px' })
  @IsOptional()
  @IsNumber()
  labelOffsetX?: number;

  @ApiPropertyOptional({ default: -24, description: 'Offset Y do rótulo em px' })
  @IsOptional()
  @IsNumber()
  labelOffsetY?: number;

  @ApiPropertyOptional({ enum: PlantHotspotLinkType, default: 'NONE' })
  @IsOptional()
  @IsEnum(PlantHotspotLinkType)
  linkType?: PlantHotspotLinkType;

  @ApiPropertyOptional({ description: 'ID do lote ou outro recurso referenciado' })
  @IsOptional()
  @IsString()
  linkId?: string;

  @ApiPropertyOptional({ description: 'URL customizada (se linkType=CUSTOM_URL)' })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional({ enum: LotStatus, description: 'Status do lote (somente type=LOTE)' })
  @IsOptional()
  @IsEnum(LotStatus)
  loteStatus?: LotStatus;

  @ApiPropertyOptional({ description: 'Metadados extras (JSON livre)' })
  @IsOptional()
  @IsObject()
  metaJson?: Record<string, any>;
}
