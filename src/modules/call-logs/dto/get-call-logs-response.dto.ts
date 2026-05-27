import { ApiProperty } from '@nestjs/swagger';
import { CallLogDto } from './call-log.dto';
import type { GetCallLogsPaginationResult } from '../types/call-logs.types';

export class GetCallLogsResponseDto {
  @ApiProperty({ type: [CallLogDto] })
  data!: CallLogDto[];

  @ApiProperty({
    example: {
      limit: 50,
      offset: 0,
      count: 50,
      total: 200,
      next: 'https://api.callover-example.com/call-logs?limit=50&offset=50',
      previous: null,
    },
  })
  pagination!: GetCallLogsPaginationResult;
}
