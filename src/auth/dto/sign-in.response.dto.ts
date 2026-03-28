import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SignInResponseDto {
    @ApiProperty({ example: '123' })
    id!: string;

    @ApiProperty({ example: 'callover_user' })
    username!: string;

    @ApiPropertyOptional({ example: 'user@mail.com' })
    email?: string;
}