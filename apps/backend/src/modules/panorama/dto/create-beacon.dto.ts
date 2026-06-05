import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PanoramaBeaconLinkType } from '@prisma/client';

export class CreateBeaconDto {
  @ApiProperty({ example: 'Av. da Amizade' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Avenida principal de acesso ao loteamento' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Posição X normalizada [0..1]',
    minimum: 0,
    maximum: 1
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  x: number;

  @ApiProperty({
    description: 'Posição Y normalizada [0..1]',
    minimum: 0,
    maximum: 1
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  y: number;

  @ApiPropertyOptional({
    description: 'Estilo do beacon (default, highlight, subtle)',
    default: 'default'
  })
  @IsOptional()
  @IsString()
  style?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @ApiPropertyOptional({
    enum: PanoramaBeaconLinkType,
    default: PanoramaBeaconLinkType.NONE,
    description: 'Tipo de link do beacon (NONE, LOT, PANORAMA, URL)'
  })
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
