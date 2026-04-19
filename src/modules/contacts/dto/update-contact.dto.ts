import { ApiPropertyOptional } from '@nestjs/swagger';
import { Prop } from '@nestjs/mongoose';

export class UpdateContactDto {
  @ApiPropertyOptional({ example: 'Ivan Ivanov' })
  @Prop()
  alias?: string;

  @ApiPropertyOptional({ example: 'BF' })
  @Prop()
  note?: string;

  @ApiPropertyOptional({ example: true })
  @Prop()
  isFavourite?: boolean;

  @ApiPropertyOptional({ example: true })
  @Prop()
  isBlocked?: boolean;

  @ApiPropertyOptional({ example: true })
  @Prop()
  isMuted?: boolean;
}
