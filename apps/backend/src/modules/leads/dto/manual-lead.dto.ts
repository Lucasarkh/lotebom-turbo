import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID
} from 'class-validator';
import { LeadStatus, LeadPaymentType, LeadPaymentStatus } from '@prisma/client';
import { CreateLeadDto } from './create-lead.dto';

export class CreateManualLeadDto extends CreateLeadDto {
  @ApiProperty({ example: 'projectId_123' })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({ example: '123.456.789-00' })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiPropertyOptional({ example: '12.345.678-9' })
  @IsOptional()
  @IsString()
  rg?: string;

  @ApiPropertyOptional({ example: '1990-01-01' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ example: 'Solteiro' })
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @ApiPropertyOptional({ example: 'Engenheiro' })
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiPropertyOptional({ example: 'Rua Exemplo, 123' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Cidade Exemplar' })
  @IsOptional()
  @IsString()
  addressCity?: string;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  addressState?: string;

  @ApiPropertyOptional({ example: '01234-567' })
  @IsOptional()
  @IsString()
  addressZip?: string;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;
}

export class UpdateLeadStatusDto {
  @ApiProperty({ enum: LeadStatus })
  @IsEnum(LeadStatus)
  status: LeadStatus;

  @ApiPropertyOptional({ example: 'Cliente enviou documentos' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddLeadDocumentDto {
  @ApiProperty({ example: 'RG Frente' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'https://...' })
  @IsUrl()
  url: string;

  @ApiProperty({ example: 'image/png' })
  @IsString()
  type: string;
}

export class AddLeadPaymentDto {
  @ApiProperty({ enum: LeadPaymentType })
  @IsEnum(LeadPaymentType)
  type: LeadPaymentType;

  @ApiProperty({ example: 1000.0 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ enum: LeadPaymentStatus })
  @IsOptional()
  @IsEnum(LeadPaymentStatus)
  status?: LeadPaymentStatus;

  @ApiPropertyOptional({ example: 'Sinal de reserva' })
  @IsOptional()
  @IsString()
  notes?: string;
}
