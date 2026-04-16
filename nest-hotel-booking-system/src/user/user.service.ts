import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(private prisma: PrismaService) {}

  // FR-3: Get own profile
  async GetProfile(username: string) {
    this.logger.log(`Fetching profile for user '${username}'...`);
    const user = await this.prisma.users.findUnique({ where: { username } });
    if (!user) {
      this.logger.warn(`Profile lookup failed: user '${username}' not found`);
      throw new NotFoundException(`User '${username}' not found.`);
    }
    const { userPassword, ...profile } = user;
    this.logger.log(`Profile retrieved for user '${username}'`);
    return { message: `Successfully retrieved profile for '${username}'.`, data: profile };
  }

  // FR-4: Update own profile
  async UpdateProfile(username: string, updateUserDto: UpdateUserDto) {
    this.logger.log(`Updating profile for user '${username}'...`);
    const user = await this.prisma.users.findUnique({ where: { username } });
    if (!user) {
      this.logger.warn(`Profile update failed: user '${username}' not found`);
      throw new NotFoundException(`User '${username}' not found.`);
    }

    // Check conflicts only if values are actually changing
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const usernameExists = await this.prisma.users.findUnique({
        where: { username: updateUserDto.username },
      });
      if (usernameExists) {
        this.logger.warn(`Profile update conflict: username '${updateUserDto.username}' already taken`);
        throw new ConflictException('Username already taken.');
      }
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailExists = await this.prisma.users.findFirst({
        where: { email: updateUserDto.email },
      });
      if (emailExists) {
        this.logger.warn(`Profile update conflict: email '${updateUserDto.email}' already in use`);
        throw new ConflictException('Email already in use.');
      }
    }

    try {
      const result = await this.prisma.users.update({
        where: { username },
        data: updateUserDto,
      });
      const { userPassword, ...updated } = result;
      this.logger.log(`Profile updated successfully for user '${username}'`);
      return { message: `Profile updated successfully.`, data: updated };
    } catch (error) {
      this.logger.error(`Failed to update profile for user '${username}'`, error.stack);
      throw new InternalServerErrorException('Something went wrong while updating the profile.');
    }
  }

  // Change password
  async changePassword(username: string, dto: ChangePasswordDto) {
    this.logger.log(`Processing password change for user '${username}'...`);
    const user = await this.prisma.users.findUnique({ where: { username } });
    if (!user) {
      this.logger.warn(`Password change failed: user '${username}' not found`);
      throw new NotFoundException(`User '${username}' not found.`);
    }

    const isPasswordValid = await bcrypt.compare(dto.oldPassword, user.userPassword);
    if (!isPasswordValid) {
      this.logger.warn(`Password change failed: incorrect old password for user '${username}'`);
      throw new BadRequestException('Old password is incorrect.');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.users.update({
      where: { username },
      data: { userPassword: hashedPassword },
    });
    this.logger.log(`Password changed successfully for user '${username}'`);
    return { message: 'Password changed successfully.' };
  }
}