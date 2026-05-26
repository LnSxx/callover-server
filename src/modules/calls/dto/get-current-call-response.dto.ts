import { ApiProperty } from '@nestjs/swagger';
import { CallDto } from './call.dto';

export class GetCurrentCallResponseDto {
  @ApiProperty({
    type: CallDto,
    nullable: true,
  })
  call!: CallDto | null;
}
