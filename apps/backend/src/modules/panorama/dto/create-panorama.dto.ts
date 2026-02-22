import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PanoramaProjection } from '@prisma/client';

export class CreatePanoramaDto {
  @ApiPropertyOptional({ description: 'Título do panorama', default: 'Vista Geral' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: PanoramaProjection, default: PanoramaProjection.FLAT })
  @IsOptional()
  @IsEnum(PanoramaProjection)
  projection?: PanoramaProjection;

  @ApiPropertyOptional({ minimum: 0, maximum: 359, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(359)
  sunPathAngleDeg?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  sunPathLabelEnabled?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  showImplantation?: boolean;

  @ApiPropertyOptional({ description: 'URL da imagem de implantação' })
  @IsOptional()
  @IsString()
  implantationUrl?: string;
}
