import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class SignInDto {
    @ApiPropertyOptional({
        description: 'Either username or email must be provided',
        example: 'callover_user',
    })
    username: string | undefined;

    @ApiPropertyOptional({
        description: 'Either username or email must be provided',
        example: 'email@email.com',
    })
    email: string | undefined;

    @ApiProperty({ example: 'u3ersPAs$w0Rd' })
    @IsString()
    password!: string;
}
