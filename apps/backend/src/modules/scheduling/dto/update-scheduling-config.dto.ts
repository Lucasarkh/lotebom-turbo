import { IsBoolean, IsInt, IsString, IsOptional, IsArray, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSchedulingConfigDto {
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(15)
  @Max(240)
  @IsOptional()
  scheduleInterval?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  leadCaptureRequired?: boolean;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  availableDays?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  endTime?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxSimultaneous?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  lunchStart?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  lunchEnd?: string;

  @ApiProperty({ required: false, type: [Object] })
  @IsArray()
  @IsOptional()
  breaks?: any[];
}
