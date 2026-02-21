import { IsCuid } from '@common/decorators/is-cuid.decorator';
import { IsNotEmpty, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class UserCuidParamDto {
  @IsCuid()
  @IsNotEmpty()
  @Length(25, 25)
  id: string;
}