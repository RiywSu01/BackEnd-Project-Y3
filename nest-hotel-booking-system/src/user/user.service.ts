import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // FR-3: Get own profile
  async GetProfile(username: string) {
    const user = await this.prisma.users.findUnique({ where: { username } });
    if (!user) {
      throw new NotFoundException(`User '${username}' not found.`);
    }
    const { userPassword, ...profile } = user;
    return { message: `Successfully retrieved profile for '${username}'.`, data: profile };
  }

  // FR-4: Update own profile
  async UpdateProfile(username: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.users.findUnique({ where: { username } });
    if (!user) {
      throw new NotFoundException(`User '${username}' not found.`);
    }

    // Check conflicts only if values are actually changing
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const usernameExists = await this.prisma.users.findUnique({
        where: { username: updateUserDto.username },
      });
      if (usernameExists) {
        throw new ConflictException('Username already taken.');
      }
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailExists = await this.prisma.users.findFirst({
        where: { email: updateUserDto.email },
      });
      if (emailExists) {
        throw new ConflictException('Email already in use.');
      }
    }

    try {
      const result = await this.prisma.users.update({
        where: { username },
        data: updateUserDto,
      });
      const { userPassword, ...updated } = result;
      return { message: `Profile updated successfully.`, data: updated };
    } catch (error) {
      throw new InternalServerErrorException('Something went wrong while updating the profile.');
    }
  }

  // Change password
  async changePassword(username: string, dto: ChangePasswordDto) {
    const user = await this.prisma.users.findUnique({ where: { username } });
    if (!user) {
      throw new NotFoundException(`User '${username}' not found.`);
    }

    const isPasswordValid = await bcrypt.compare(dto.oldPassword, user.userPassword);
    if (!isPasswordValid) {
      throw new BadRequestException('Old password is incorrect.');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.users.update({
      where: { username },
      data: { userPassword: hashedPassword },
    });
    return { message: 'Password changed successfully.' };
  }
}