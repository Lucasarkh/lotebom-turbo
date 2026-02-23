import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  utmSource: string;

  @IsString()
  @IsOptional()
  utmMedium?: string;

  @IsString()
  @IsNotEmpty()
  utmCampaign: string;

  @IsString()
  @IsOptional()
  utmContent?: string;

  @IsString()
  @IsOptional()
  utmTerm?: string;

  @IsNumber()
  @IsOptional()
  budget?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateCampaignDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  utmSource?: string;

  @IsString()
  @IsOptional()
  utmMedium?: string;

  @IsString()
  @IsOptional()
  utmCampaign?: string;

  @IsString()
  @IsOptional()
  utmContent?: string;

  @IsString()
  @IsOptional()
  utmTerm?: string;

  @IsNumber()
  @IsOptional()
  budget?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class CreateCampaignInvestmentDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CampaignReportQueryDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
