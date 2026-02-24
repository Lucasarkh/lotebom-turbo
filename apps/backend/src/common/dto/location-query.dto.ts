import { IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class LocationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radiusKm?: number = 5;
}
