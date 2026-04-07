import { IsNotEmpty, IsString } from "class-validator";

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({message: 'Password is required.'})
  oldPassword: string;
  
  @IsString()
  @IsNotEmpty({message: 'New password is required.'})
  newPassword: string;
}