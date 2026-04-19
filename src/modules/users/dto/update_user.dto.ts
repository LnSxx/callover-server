import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'calloveruser',
  })
  username?: string;

  @ApiPropertyOptional({
    example: 'email@email.com',
  })
  email?: string;

  @ApiProperty({
    example: 'u3ersPAs$w0Rd',
  })
  password?: string;
}
