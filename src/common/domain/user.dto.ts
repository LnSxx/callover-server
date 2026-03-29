import { ApiProperty } from "@nestjs/swagger";

export class UserDto {
    @ApiProperty({
        example: '123',
    })
    id!: string;

    @ApiProperty({
        example: 'calloveruser',
    })
    username!: string;

    @ApiProperty({
        example: 'email@example.com',
    })
    email?: string;
}