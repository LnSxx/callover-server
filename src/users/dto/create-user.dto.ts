import { IsAlphanumeric, IsEmail, IsNotEmpty, IsString, MinLength, NotContains } from "class-validator";

export class CreateUserDto {
    @IsAlphanumeric()
    @MinLength(4)
    username!: string;

    @IsEmail()
    email!: string;

    @IsString()
    @NotContains(' ', { message: 'Password should not contain spaces' })
    @MinLength(8)
    password!: string;
}
