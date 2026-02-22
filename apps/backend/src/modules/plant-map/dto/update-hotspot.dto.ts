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
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  LotStatus,
  PlantHotspotLinkType,
  PlantHotspotType,
} from '@prisma/client';

export class UpdateHotspotDto {
  @ApiPropertyOptional({ enum: PlantHotspotType })
  @IsOptional()
  @IsEnum(PlantHotspotType)
  type?: PlantHotspotType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  x?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  y?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  labelEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  labelOffsetX?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  labelOffsetY?: number;

  @ApiPropertyOptional({ enum: PlantHotspotLinkType })
  @IsOptional()
  @IsEnum(PlantHotspotLinkType)
  linkType?: PlantHotspotLinkType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional({ enum: LotStatus })
  @IsOptional()
  @IsEnum(LotStatus)
  loteStatus?: LotStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metaJson?: Record<string, any>;
}
