import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBooleanString,
  IsDateString,
  IsOptional,
  IsString,
  Max,
  Min,
  IsInt,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FindContactsQueryDto {
  @ApiPropertyOptional({ example: 'ivan' })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(80)
  search?: string;

  @ApiPropertyOptional({ example: '2026-04-29T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  changedAfter?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBooleanString()
  isFavourite?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBooleanString()
  isBlocked?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBooleanString()
  isMuted?: string;

  @ApiPropertyOptional({ example: 50, default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Pagination cursor returned by previous response',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
