import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UnauthorizedException, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GetUser } from '../auth/decorators/GetUserJWT-Payload';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { users_roles } from '@prisma/client';

@ApiTags('User')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard) 
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  //Get Own Profile Endpoint (For User to see their own profile)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully', schema: { example: { message: "Successfully retrieved profile for 'johndoe'.", data: { id: 1, username: 'johndoe', email: 'john@test.com', roles: 'USER', created_at: '2026-04-14T00:00:00Z', updated_at: '2026-04-14T00:00:00Z' } } } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { example: { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' } } })
  @ApiResponse({ status: 404, description: 'User not found', schema: { example: { statusCode: 404, message: "User 'johndoe' not found.", error: 'Not Found' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Roles(users_roles.USER, users_roles.ADMIN)
  @Get('profile')
  GetProfile(
    @GetUser('username') username: string,
  ) {
    return this.userService.GetProfile(username);
  }

  //Update Own Profile Endpoint (For User to update their own profile)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully', schema: { example: { message: 'Profile updated successfully.', data: { id: 1, username: 'johndoe_new', email: 'john@test.com', roles: 'USER', created_at: '2026-04-14T00:00:00Z', updated_at: '2026-04-14T00:00:00Z' } } } })
  @ApiResponse({ status: 400, description: 'Validation failed', schema: { example: { statusCode: 400, message: ['email must be an email'], error: 'Bad Request' } } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { example: { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' } } })
  @ApiResponse({ status: 404, description: 'User not found', schema: { example: { statusCode: 404, message: "User 'johndoe' not found.", error: 'Not Found' } } })
  @ApiResponse({ status: 409, description: 'Conflict', schema: { example: { statusCode: 409, message: 'Username already taken.', error: 'Conflict' } } })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Roles(users_roles.USER, users_roles.ADMIN)
  @Patch('update-profile')
  UpdateProfile(
    @GetUser('username') username: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return this.userService.UpdateProfile(username, updateUserDto);
  }

  //User Change Password Endpoint (For User to update their own password)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully', schema: { example: { message: 'Password changed successfully.' } } })
  @ApiResponse({ status: 400, description: 'Bad Request', schema: { example: { statusCode: 400, message: 'Old password is incorrect.', error: 'Bad Request' } } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { example: { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' } } })
  @ApiResponse({ status: 404, description: 'User not found', schema: { example: { statusCode: 404, message: "User 'johndoe' not found.", error: 'Not Found' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Roles(users_roles.USER, users_roles.ADMIN)
  @Patch('change-password')
  changePassword(
    @GetUser('username') username: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(username, changePasswordDto);
  }

}
