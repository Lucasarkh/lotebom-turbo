import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  Matches
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX
} from '@/common/security/password-policy';

export class RegisterTenantDto {
  @ApiProperty({ description: 'Nome da loteadora/incorporadora', example: 'Loteadora Vista Verde' })
  @IsString()
  @IsNotEmpty({ message: 'Nome da empresa é obrigatório' })
  tenantName: string;

  @ApiProperty({ description: 'Slug único para URL do tenant', example: 'vista-verde' })
  @IsString()
  @IsNotEmpty({ message: 'Slug é obrigatório' })
  tenantSlug: string;

  @ApiPropertyOptional({ description: 'Domínio personalizado para o portal', example: 'vendas.vistaverde.com.br' })
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiPropertyOptional({ description: 'CNPJ da empresa', example: '12.345.678/0001-90' })
  @IsOptional()
  @IsString()
  cnpj?: string;

  @ApiPropertyOptional({ description: 'Razão social', example: 'Vista Verde Empreendimentos Ltda' })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional({ description: 'Inscrição estadual', example: '123456789' })
  @IsOptional()
  @IsString()
  stateRegistration?: string;

  @ApiPropertyOptional({ description: 'Inscrição municipal', example: '987654321' })
  @IsOptional()
  @IsString()
  municipalRegistration?: string;

  @ApiPropertyOptional({ description: 'Nome do representante legal', example: 'Maria Souza' })
  @IsOptional()
  @IsString()
  legalRepresentative?: string;

  @ApiPropertyOptional({ description: 'Número CRECI', example: 'CRECI-GO 12345 J' })
  @IsOptional()
  @IsString()
  creci?: string;

  @ApiPropertyOptional({ description: 'Telefone comercial', example: '(62) 99999-9999' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'WhatsApp comercial', example: '(62) 98888-7777' })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional({ description: 'E-mail público da empresa', example: 'contato@vistaverde.com.br' })
  @IsOptional()
  @IsString()
  publicEmail?: string;

  @ApiPropertyOptional({ description: 'Site da empresa', example: 'https://vistaverde.com.br' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'Nome do contato', example: 'Fernanda Rocha' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: 'E-mail do contato', example: 'comercial@vistaverde.com.br' })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Telefone do contato', example: '(62) 3333-2222' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'CEP do endereço', example: '74000-000' })
  @IsOptional()
  @IsString()
  addressZipCode?: string;

  @ApiPropertyOptional({ description: 'Logradouro', example: 'Av. Central' })
  @IsOptional()
  @IsString()
  addressStreet?: string;

  @ApiPropertyOptional({ description: 'Número', example: '1000' })
  @IsOptional()
  @IsString()
  addressNumber?: string;

  @ApiPropertyOptional({ description: 'Complemento', example: 'Sala 1201' })
  @IsOptional()
  @IsString()
  addressComplement?: string;

  @ApiPropertyOptional({ description: 'Bairro', example: 'Centro' })
  @IsOptional()
  @IsString()
  addressDistrict?: string;

  @ApiPropertyOptional({ description: 'Cidade', example: 'Goiania' })
  @IsOptional()
  @IsString()
  addressCity?: string;

  @ApiPropertyOptional({ description: 'UF', example: 'GO' })
  @IsOptional()
  @IsString()
  addressState?: string;

  @ApiPropertyOptional({ description: 'País', example: 'Brasil' })
  @IsOptional()
  @IsString()
  addressCountry?: string;

  @ApiProperty({ description: 'Nome do administrador', example: 'Carlos Admin' })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @ApiProperty({ description: 'E-mail do administrador', example: 'admin@vistaverde.com' })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @ApiProperty({ description: 'Senha do administrador (deve atender à política de segurança)', example: 'senhaSegura123' })
  @IsString()
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  password: string;
}
