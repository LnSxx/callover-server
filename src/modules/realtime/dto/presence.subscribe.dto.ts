import { IsArray, IsString } from 'class-validator';

export class PresenceSubscribeDto {
  @IsArray()
  @IsString({ each: true })
  userIds!: string[];
}
