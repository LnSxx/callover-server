import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id!: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  ownerId!: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  contactUserId!: string;

  @ApiPropertyOptional({ example: 'Ivan Ivanov' })
  alias?: string;

  @ApiPropertyOptional({ example: 'Best friend' })
  note?: string;

  @ApiProperty({ example: true })
  isFavourite!: boolean;

  @ApiProperty({ example: true })
  isBlocked!: boolean;

  @ApiProperty({ example: true })
  isMuted!: boolean;

  @ApiProperty({ example: '2026-04-29T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-29T10:00:00.000Z' })
  updatedAt!: string;
}
