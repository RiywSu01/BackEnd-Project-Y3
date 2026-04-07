import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class CreateUserDto {
    @IsString({message: 'Username must be a string.'})
    @IsNotEmpty({message: 'Username is required.'})
    username: string;

    @IsString({message: 'Password must be a string.'})
    @IsNotEmpty({message: 'Password is required.'})
    password: string;

    @IsEmail(
        {require_tld: true}, //forces the email to have a top-level domain like .com or .org.
        {message: 'Email must be a valid email address. try to include a top-level domain like ".com or .org." and "@" symbol.'}
    )
    @IsNotEmpty({message: 'Email is required.'})
    email: string;
}
