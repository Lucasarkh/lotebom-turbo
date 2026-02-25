import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterTenantDto {
  @ApiProperty({ example: 'Loteadora Vista Verde' })
  @IsString()
  @IsNotEmpty({ message: 'Nome da empresa é obrigatório' })
  tenantName: string;

  @ApiProperty({ example: 'vista-verde' })
  @IsString()
  @IsNotEmpty({ message: 'Slug é obrigatório' })
  tenantSlug: string;

  @ApiPropertyOptional({ example: 'vendas.vistaverde.com.br' })
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiProperty({ example: 'Carlos Admin' })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @ApiProperty({ example: 'admin@vistaverde.com' })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @ApiProperty({ example: 'senhaSegura123' })
  @IsString()
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter pelo menos 6 caracteres' })
  password: string;
}
