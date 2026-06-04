import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  PASSWORD_POLICY_MESSAGE,
  PASSWORD_POLICY_REGEX
} from '@/common/security/password-policy';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Novo nome do usuário', example: 'Ana Silva' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Nova senha do usuário (deve atender à política de segurança)', example: 'novaSenha123' })
  @IsOptional()
  @IsString()
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  password?: string;

  @ApiPropertyOptional({ description: 'Novo papel do usuário no sistema', enum: UserRole, example: 'LOTEADORA' })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role inválida' })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Novas permissões de acesso aos módulos do painel (read/write/none)',
    example: {
      projects: 'write',
      leads: 'read',
      distribution: 'none',
    },
  })
  @IsOptional()
  panelPermissions?: Record<string, string>;
}
