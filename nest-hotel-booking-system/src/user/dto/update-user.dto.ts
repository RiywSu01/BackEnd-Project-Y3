import { OmitType, PartialType } from '@nestjs/mapped-types'; // or '@nestjs/swagger' if using Swagger
import { CreateUserDto } from './create-user.dto';

// This automatically inherits all fields from CreateUserDto, but makes them optional.
// 1. OmitType removes the password, Prevent "password" field from the update template.
// 2. PartialType makes the remaining fields (username, email) optional.
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {}
// By doing this, even if a user tries to send a "password" key in the body, your DTO will not recognize it as a valid updatable field.