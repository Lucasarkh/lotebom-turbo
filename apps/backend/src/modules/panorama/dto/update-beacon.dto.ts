import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PanoramaBeaconLinkType } from '@prisma/client';

export class UpdateBeaconDto {
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
  style?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @ApiPropertyOptional({ enum: PanoramaBeaconLinkType, description: 'Tipo de link do beacon' })
  @IsOptional()
  @IsEnum(PanoramaBeaconLinkType)
  linkType?: PanoramaBeaconLinkType;

  @ApiPropertyOptional({ description: 'ID do lote vinculado (quando linkType=LOT)' })
  @IsOptional()
  @IsString()
  linkLotId?: string;

  @ApiPropertyOptional({ description: 'ID do panorama vinculado (quando linkType=PANORAMA)' })
  @IsOptional()
  @IsString()
  linkPanoramaId?: string;

  @ApiPropertyOptional({ description: 'URL do link (quando linkType=URL)' })
  @IsOptional()
  @IsString()
  linkUrl?: string;
}
