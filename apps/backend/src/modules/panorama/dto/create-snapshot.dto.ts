import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSnapshotDto {
  @ApiProperty({ description: 'URL da imagem do snapshot' })
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  imageWidth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  imageHeight?: number;

  @ApiProperty({
    description: 'Rótulo do período (ex: Novembro/25)',
    example: 'Novembro/25'
  })
  @IsString()
  label: string;

  @ApiPropertyOptional({ description: 'Data de referência do snapshot' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Ordem de exibição', default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
