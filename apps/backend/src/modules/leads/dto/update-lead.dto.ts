import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStatus } from '@prisma/client';

export class UpdateLeadDto {
  @ApiPropertyOptional({ enum: LeadStatus, example: 'CONTACTED' })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;
}
