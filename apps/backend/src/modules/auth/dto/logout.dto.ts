import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogoutDto {
  @ApiProperty({
    description: 'ID do usuário',
    example: 'clx2abc...',
  })
  @IsString()
  @IsNotEmpty({ message: 'ID do usuário é obrigatório' })
  id: string;
}
