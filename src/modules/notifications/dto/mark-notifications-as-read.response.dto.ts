import { ApiProperty } from '@nestjs/swagger';

export class MarkNotificationsAsReadResponseDto {
  @ApiProperty({ type: Number, example: 50 })
  unreadRemain!: number;
}
