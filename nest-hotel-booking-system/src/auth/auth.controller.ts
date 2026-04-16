import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // FR-1: Register
  // Strict rate limit: 10 requests per 60 seconds to prevent abuse
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered', schema: { example: { message: 'User registered successfully.', data: { id: 1, username: 'johndoe', email: 'john@test.com', roles: 'USER' } } } })
  @ApiResponse({ status: 400, description: 'Validation failed', schema: { example: { statusCode: 400, message: 'Username, password and email are required.', error: 'Bad Request' } } })
  @ApiResponse({ status: 409, description: 'Conflict', schema: { example: { statusCode: 409, message: 'Username or email already exists.', error: 'Conflict' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Post('register')
  register(@Body() registerDto: CreateUserDto) {
    return this.authService.register(registerDto);
  }

  // FR-2: Login
  // Strict rate limit: 10 requests per 60 seconds to prevent brute-force attacks
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Login a user and return a JWT token' })
  @ApiResponse({ status: 200, description: 'Login successful', schema: { example: { message: 'Login successful.', access_token: 'eyJhbG...', user: { id: 1, username: 'johndoe', email: 'john@test.com', roles: 'USER' } } } })
  @ApiResponse({ status: 400, description: 'Bad Request', schema: { example: { statusCode: 400, message: 'Username and password are required.', error: 'Bad Request' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized', schema: { example: { statusCode: 401, message: 'Username not found or password incorrect', error: 'Unauthorized' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // FR-2: Logout
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout a user (invalidate token cache)' })
  @ApiResponse({ status: 200, description: 'Logout successful', schema: { example: { message: 'Logged out successfully.' } } })
  @ApiResponse({ status: 400, description: 'Bad Request', schema: { example: { statusCode: 400, message: 'Token is required for logout.', error: 'Bad Request' } } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { example: { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Request() req) {
    const token = req.headers.authorization?.split(' ')[1];
    return this.authService.logout(token);
  }
}