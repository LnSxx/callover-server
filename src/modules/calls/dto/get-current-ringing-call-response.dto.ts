import { ApiProperty } from '@nestjs/swagger';
import { CallDto } from './call.dto';
import { PendingIceCandidateDto } from './pending-ice-candidate.dto';

export class GetCurrentRingingCallResponseDto {
  @ApiProperty({
    type: CallDto,
    nullable: true,
  })
  call!: CallDto | null;

  @ApiProperty({
    type: [PendingIceCandidateDto],
  })
  pendingIceCandidates!: PendingIceCandidateDto[];
}
