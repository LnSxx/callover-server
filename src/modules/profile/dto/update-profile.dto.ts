import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidUsername } from '../../../common/validators/is-valid-username';
import { IsEmail, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'calloveruser',
  })
  @IsOptional()
  @IsValidUsername()
  username?: string;

  @ApiPropertyOptional({
    example: 'email@email.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}
