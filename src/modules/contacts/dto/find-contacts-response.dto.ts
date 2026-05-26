import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactDto } from './contact.dto';

export class FindContactsResponseDto {
  @ApiProperty({ type: [ContactDto] })
  items!: ContactDto[];

  @ApiPropertyOptional({
    example: 'eyJ1cGRhdGVkQXQiOiIyMDI2LTA0L',
  })
  nextCursor!: string | null;
}
