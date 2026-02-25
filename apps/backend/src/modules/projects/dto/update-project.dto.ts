import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus, ReservationFeeType } from '@prisma/client';

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'Residencial Parque dos Ipês v2' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'parque-dos-ipes-v2' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'Nova descrição do loteamento.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'http://example.com/map.png' })
  @IsOptional()
  @IsString()
  bannerImageUrl?: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ example: 'vendas.meu-loteamento.com.br' })
  @IsOptional()
  @IsString()
  customDomain?: string | null;

  @ApiPropertyOptional({ description: 'Dados do mapa do editor (JSON)' })
  @IsOptional()
  mapData?: any;

  @ApiPropertyOptional({
    description: 'Destaques/diferenciais do loteamento [{icon, label, value}]'
  })
  @IsOptional()
  highlightsJson?: any;

  @ApiPropertyOptional({
    description: 'Exibe tabela de condições de pagamento nas páginas públicas'
  })
  @IsOptional()
  showPaymentConditions?: boolean;

  @ApiPropertyOptional({
    description: 'Valor inicial do investimento (ex: 144000)'
  })
  @IsOptional()
  startingPrice?: number;

  @ApiPropertyOptional({ description: 'Quantidade máxima de parcelas' })
  @IsOptional()
  maxInstallments?: number;

  @ApiPropertyOptional({
    description:
      'Resumo das condições de pagamento (ex: Entrada facilitada em 6x)'
  })
  @IsOptional()
  @IsString()
  paymentConditionsSummary?: string;

  @ApiPropertyOptional({
    description: 'Texto de localização e infraestrutura do entorno'
  })
  @IsOptional()
  @IsString()
  locationText?: string;

  @ApiPropertyOptional({ description: 'Endereço escrito do loteamento' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Link ou Embed URL do Google Maps' })
  @IsOptional()
  @IsString()
  googleMapsUrl?: string;

  @ApiPropertyOptional({ enum: ReservationFeeType })
  @IsOptional()
  @IsEnum(ReservationFeeType)
  reservationFeeType?: ReservationFeeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  reservationFeeValue?: number;
}
