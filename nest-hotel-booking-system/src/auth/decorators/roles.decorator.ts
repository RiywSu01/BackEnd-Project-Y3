import { SetMetadata } from '@nestjs/common';
import { users_roles } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: users_roles[]) => SetMetadata(ROLES_KEY, roles);