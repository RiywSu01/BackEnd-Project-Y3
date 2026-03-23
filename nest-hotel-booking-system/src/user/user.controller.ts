import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GetUser } from 'src/auth/declarators/GetUserJWT-Payload';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  //Endpoint for User to see their own profile
  //@UseGuards(JwtAuthGuard) //This line is important to make the @GetUser() Work!!!
  @Get('profile')
  GetProfile(
    @GetUser('username') username: string,
  ) {
    return this.userService.GetProfile(username);
  }

  //Endpoint for User to update their own profile
  //@UseGuards(JwtAuthGuard)
  @Patch('update-profile')
  UpdateProfile(
    @GetUser('username') username: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return this.userService.UpdateProfile(username, updateUserDto);
  }

  //Endpoint for User to update their own password
  //@UseGuards(JwtAuthGuard)
  @Patch('change-password')
  changePassword(
    @GetUser('username') username: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(username, changePasswordDto);
  }

}
