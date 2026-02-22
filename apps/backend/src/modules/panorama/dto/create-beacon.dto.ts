import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBeaconDto {
  @ApiProperty({ example: 'Av. da Amizade' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Avenida principal de acesso ao loteamento' })
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

  @ApiPropertyOptional({ description: 'Estilo do beacon (default, highlight, subtle)', default: 'default' })
  @IsOptional()
  @IsString()
  style?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}
