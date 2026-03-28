import { IsAlphanumeric, IsEmail, IsString, MinLength, NotContains } from "class-validator";

export class UpdateUserDto {
    @IsAlphanumeric()
    @NotContains(' ', { message: 'Username should not contain spaces' })
    @MinLength(4)
    username?: string;

    @IsEmail()
    email?: string;

    @IsString()
    @NotContains(' ', { message: 'Password should not contain spaces' })
    @MinLength(8)
    password?: string;
}

