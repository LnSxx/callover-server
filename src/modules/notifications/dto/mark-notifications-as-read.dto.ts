import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsMongoId, ArrayNotEmpty } from 'class-validator';

export class MarkNotificationsAsReadDto {
  @ApiProperty({
    example: ['notification-id-1', 'notification-id-2'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  notificationIds!: string[];
}
