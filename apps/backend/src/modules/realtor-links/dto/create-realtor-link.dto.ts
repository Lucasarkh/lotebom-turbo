import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRealtorLinkDto {
  @ApiProperty({ example: 'João Corretor' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  creci?: string;

  @ApiPropertyOptional({ description: 'URL da foto do corretor' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiProperty({ example: 'joao-corretor', description: 'Código curto usado na URL (?c=CODIGO)' })
  @IsString()
  @MaxLength(64)
  code: string;

  @ApiPropertyOptional({ description: 'ID do projeto vinculado (null = válido para todos os projetos do tenant)' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
