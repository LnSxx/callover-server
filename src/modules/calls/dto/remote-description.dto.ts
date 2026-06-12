import { ApiProperty } from '@nestjs/swagger';
import type { RemoteDescriptionType } from '../../../entities/remote-description';
import { IsIn } from 'class-validator';

export class RemoteDescriptionDto {
  @ApiProperty({ enum: ['offer', 'answer'] })
  @IsIn(['offer', 'answer'])
  type!: RemoteDescriptionType;

  @ApiProperty()
  sdp!: string;
}
