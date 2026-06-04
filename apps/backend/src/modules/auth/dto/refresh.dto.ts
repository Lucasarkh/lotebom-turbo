import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({
    description: 'ID do usuário',
    example: 'clx2abc...',
  })
  @IsString()
  @IsNotEmpty({ message: 'ID do usuário é obrigatório' })
  id: string;

  @ApiProperty({
    description: 'Refresh token obtido no login',
    example: 'eyJhbGciOiJIUzI1NiIs...',
  })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token é obrigatório' })
  refresh_token: string;
}
