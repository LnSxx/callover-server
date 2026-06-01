import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CallLogDto } from './call-log.dto';

export class GetCallLogsResponseDto {
  @ApiProperty({ type: [CallLogDto] })
  data!: CallLogDto[];

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Cursor for loading older call logs',
  })
  nextCursor!: string | null;
}
