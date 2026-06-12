import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PendingIceCandidateDto {
  @ApiProperty()
  fromUserId!: string;

  @ApiProperty()
  sdp!: string;

  @ApiProperty()
  sdpMLineIndex!: number;

  @ApiPropertyOptional()
  sdpMid?: string;
}
