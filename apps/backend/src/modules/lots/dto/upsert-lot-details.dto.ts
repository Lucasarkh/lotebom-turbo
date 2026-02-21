import { IsEnum, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LotStatus, SlopeType } from '@prisma/client';

export class UpsertLotDetailsDto {
  @ApiPropertyOptional({ enum: LotStatus, example: 'AVAILABLE' })
  @IsOptional()
  @IsEnum(LotStatus)
  status?: LotStatus;

  @ApiPropertyOptional({ example: 120000 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ example: 300 })
  @IsOptional()
  @IsNumber()
  areaM2?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  frontage?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  depth?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  sideLeft?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  sideRight?: number;

  @ApiPropertyOptional({ enum: SlopeType, example: 'FLAT' })
  @IsOptional()
  @IsEnum(SlopeType)
  slope?: SlopeType;

  @ApiPropertyOptional({ description: 'Condições de pagamento (JSON)' })
  @IsOptional()
  @IsObject()
  conditionsJson?: any;

  @ApiPropertyOptional({ description: 'Medidas por lado do polígono (JSON)' })
  @IsOptional()
  @IsObject()
  sideMetricsJson?: any;

  @ApiPropertyOptional({ example: 'Lote de esquina' })
  @IsOptional()
  @IsString()
  notes?: string;
}
