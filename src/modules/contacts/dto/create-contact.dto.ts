import { Prop } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ example: '123' })
  @Prop({ required: true })
  contactUserId!: string;

  @ApiPropertyOptional({ example: 'Ivan Ivanov' })
  @Prop()
  alias?: string;

  @ApiPropertyOptional({ example: 'BF' })
  @Prop()
  note?: string;
}
