import {users_roles} from '@prisma/client';
export class CreateUserDto {
    id: number;
    username: string;
    password: string;
    email: string;
    role: users_roles;
}
