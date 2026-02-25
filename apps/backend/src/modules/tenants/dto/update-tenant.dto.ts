import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'Loteadora Vista Verde' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'vista-verde' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'vendas.vistaverde.com.br' })
  @IsOptional()
  @IsString()
  customDomain?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
