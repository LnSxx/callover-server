import { ApiProperty } from '@nestjs/swagger';
import { CallDto } from './call.dto';

export class GetCurrentRingingCallResponseDto {
  @ApiProperty({
    type: CallDto,
    nullable: true,
  })
  call!: CallDto | null;
}
