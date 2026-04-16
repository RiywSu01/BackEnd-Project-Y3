import {BadRequestException, ConflictException, Injectable, InternalServerErrorException, UnauthorizedException, Logger} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // In-memory blacklist for logged-out tokens
  private tokenBlacklist = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // FR-1: Sign up
  async register(dto: CreateUserDto) {
      this.logger.log(`Registering new user '${dto.username}'...`);
      if(!dto.username || !dto.password || !dto.email){
        this.logger.warn('Registration attempt with missing fields');
        throw new BadRequestException('Username, password and email are required.');
      }
      const existingUser = await this.prisma.users.findFirst({
        where: { OR: [{ username: dto.username }, { email: dto.email }] },
      });
      if (existingUser) {
        this.logger.warn(`Registration conflict: username '${dto.username}' or email '${dto.email}' already exists`);
        throw new ConflictException('Username or email already exists.');
      }

      const hashedPassword = await bcrypt.hash(dto.password, 12);
      const user = await this.prisma.users.create({
        data: {
          username: dto.username,
          userPassword: hashedPassword,
          email: dto.email,
        },
      });
      const { userPassword, ...result } = user;
      this.logger.log(`User '${dto.username}' registered successfully`);
      return { message: 'User registered successfully.', data: result };
  }

  // FR-2: Login
  async login(dto: LoginDto) {
      this.logger.log(`Authenticating user '${dto.username}'...`);
      if(!dto.username || !dto.password){
        this.logger.warn('Login attempt with missing credentials');
        throw new BadRequestException('Username and password are required.');
      }
      const user = await this.prisma.users.findUnique({ where: { username: dto.username } });
      if (!user) {
        this.logger.warn(`Failed login attempt: username '${dto.username}' not found`);
        throw new UnauthorizedException(`Username:'${dto.username}' not found, please make sure you already registered and try again.`);
      }

      const isPasswordValid = await bcrypt.compare(dto.password, user.userPassword);
      if (!isPasswordValid) {
        this.logger.warn(`Failed login attempt: incorrect password for user '${dto.username}'`);
        throw new UnauthorizedException('Password is incorrect, please retry again.');
      }

      const payload = { sub: user.id, username: user.username, roles: user.roles };
      const token = this.jwtService.sign(payload);
      this.logger.log(`User '${user.username}' logged in successfully`);

      return {
        message: 'Login successful.',
        access_token: token,
        user: { id: user.id, username: user.username, email: user.email, roles: user.roles },
      };
  }
    
  

  // FR-2: Logout (blacklist token) //just add the token to the blacklist, didnt delete it.
  async logout(token: string) {
      this.logger.log('Processing logout request...');
      if (!token) {
        this.logger.warn('Logout attempt without token');
        throw new BadRequestException('Token is required for logout.');
      }
      if (token) {
        this.tokenBlacklist.add(token);
      }
      this.logger.log('User logged out successfully, token blacklisted');
      return { message: 'Logged out successfully.' };
  }

  // This function is not have endpoint to called yet
  isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklist.has(token);
  }

  
}