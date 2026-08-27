import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateLotCategoryDto {
  @ApiPropertyOptional({ example: 'Premium' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 'Lotes com atributos mais valorizados do empreendimento.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: '50% 30%',
    description: 'Ponto de foco do banner, no formato "X% Y%" (0 a 100).',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(100|[0-9]{1,2})% (100|[0-9]{1,2})%$/, {
    message: 'bannerPosition deve seguir o formato "50% 30%".',
  })
  bannerPosition?: string;
}