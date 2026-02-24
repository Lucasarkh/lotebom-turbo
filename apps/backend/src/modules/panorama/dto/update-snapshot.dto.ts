import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSnapshotDto {
  @ApiPropertyOptional({ description: 'URL da imagem do snapshot' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  imageWidth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  imageHeight?: number;

  @ApiPropertyOptional({ description: 'Rótulo do período (ex: Novembro/25)' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Data de referência do snapshot' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Ordem de exibição' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
