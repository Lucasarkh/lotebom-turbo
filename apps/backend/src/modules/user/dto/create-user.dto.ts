import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsOptional } from 'class-validator';
import {
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX
} from '@/common/security/password-policy';

export class CreateUserDto {
  @ApiProperty({ description: 'Nome completo do usuário', example: 'Ana Editora' })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @ApiProperty({ description: 'E-mail do usuário (deve ser único)', example: 'ana@vistaverde.com' })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @ApiProperty({ description: 'Senha do usuário (deve atender à política de segurança)', example: 'senha123' })
  @IsString()
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  password: string;

  @ApiPropertyOptional({ description: 'Papel do usuário no sistema', enum: UserRole, example: 'LOTEADORA' })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role inválida' })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Permissões de acesso aos módulos do painel (read/write/none)',
    example: {
      projects: 'write',
      leads: 'read',
      distribution: 'none',
    },
  })
  @IsOptional()
  panelPermissions?: Record<string, string>;
}
