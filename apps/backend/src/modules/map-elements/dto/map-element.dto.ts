import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MapElementType, GeometryType } from '@prisma/client';
import { Type } from 'class-transformer';

export class MapElementDto {
  @ApiPropertyOptional({ description: 'ID existente para upsert, omitir para criar' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ enum: MapElementType })
  @IsEnum(MapElementType)
  @IsNotEmpty()
  type: MapElementType;

  @ApiPropertyOptional({ example: 'Quadra A - Lote 01' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'QA-L01' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ enum: GeometryType })
  @IsEnum(GeometryType)
  @IsNotEmpty()
  geometryType: GeometryType;

  @ApiProperty({ description: 'JSON da geometria (pontos, raio, etc)' })
  @IsNotEmpty()
  geometryJson: any;

  @ApiPropertyOptional({ description: 'JSON de estilo (fill, stroke, opacity, zIndex)' })
  @IsOptional()
  styleJson?: any;

  @ApiPropertyOptional({ description: 'JSON de metadados específicos do tipo' })
  @IsOptional()
  metaJson?: any;
}

export class BulkMapElementsDto {
  @ApiProperty({ type: [MapElementDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MapElementDto)
  elements: MapElementDto[];
}
