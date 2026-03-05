import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsDateString,
  IsBoolean,
  IsNotEmpty,
  IsEmail,
  Min,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateInviteCodeDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum([UserRole.CORRETOR, UserRole.IMOBILIARIA])
  @IsOptional()
  role?: UserRole;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxUses?: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class RegisterWithInviteCodeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  creci?: string;

  // For IMOBILIARIA role: agency name
  @IsString()
  @IsOptional()
  agencyName?: string;
}

export class UpdateInviteCodeDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxUses?: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
