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
import { PanoramaProjection } from '@prisma/client';

export class UpdatePanoramaDto {
  @ApiPropertyOptional({ description: 'Título do panorama' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: PanoramaProjection })
  @IsOptional()
  @IsEnum(PanoramaProjection)
  projection?: PanoramaProjection;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 359 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(359)
  sunPathAngleDeg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sunPathLabelEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showImplantation?: boolean;

  @ApiPropertyOptional({ description: 'URL da imagem de implantação' })
  @IsOptional()
  @IsString()
  implantationUrl?: string;
}
