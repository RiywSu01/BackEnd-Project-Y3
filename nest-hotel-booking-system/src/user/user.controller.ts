import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UnauthorizedException, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GetUser } from 'src/auth/decorators/GetUserJWT-Payload';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { users_roles } from '@prisma/client';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  //Get Own Profile Endpoint (For User to see their own profile)
  @UseGuards(JwtAuthGuard, RolesGuard) //This line is important to make the @GetUser() Work!!!
  @Roles(users_roles.USER)
  @Get('profile')
  GetProfile(
    @GetUser('username') username: string,
  ) {
    return this.userService.GetProfile(username);
  }

  //Update Own Profile Endpoint (For User to update their own profile)
  @UseGuards(JwtAuthGuard, RolesGuard) 
  @Roles(users_roles.USER)
  @Patch('update-profile')
  UpdateProfile(
    @GetUser('username') username: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return this.userService.UpdateProfile(username, updateUserDto);
  }

  //User Change Password Endpoint (For User to update their own password)
  @UseGuards(JwtAuthGuard, RolesGuard) 
  @Roles(users_roles.USER)
  @Patch('change-password')
  changePassword(
    @GetUser('username') username: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(username, changePasswordDto);
  }

}
