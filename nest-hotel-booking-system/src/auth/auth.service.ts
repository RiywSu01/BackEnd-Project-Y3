import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  // In-memory blacklist for logged-out tokens
  private tokenBlacklist = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // FR-1: Sign up
  async register(dto: CreateUserDto) {
    if (!dto.username || !dto.password || !dto.email) {
      throw new BadRequestException('Username, password, and email are required.');
    }

    const existingUser = await this.prisma.users.findFirst({
      where: { OR: [{ username: dto.username }, { email: dto.email }] },
    });
    if (existingUser) {
      throw new ConflictException('Username or email already exists.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    try {
      const user = await this.prisma.users.create({
        data: {
          username: dto.username,
          userPassword: hashedPassword,
          email: dto.email,
        },
      });
      const { userPassword, ...result } = user;
      return { message: 'User registered successfully.', data: result };
    } catch (error) {
      throw new InternalServerErrorException('Something went wrong during registration.');
    }
  }

  // FR-2: Login
  async login(dto: LoginDto) {
    if (!dto.username || !dto.password) {
      throw new BadRequestException('Username and password are required.');
    }

    const user = await this.prisma.users.findUnique({ where: { username: dto.username } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.userPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const payload = { sub: user.id, username: user.username, roles: user.roles };
    const token = this.jwtService.sign(payload);

    return {
      message: 'Login successful.',
      access_token: token,
      user: { id: user.id, username: user.username, email: user.email, roles: user.roles },
    };
  }

  // FR-2: Logout (blacklist token)
  async logout(token: string) {
    if (token) {
      this.tokenBlacklist.add(token);
    }
    return { message: 'Logged out successfully.' };
  }

  isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklist.has(token);
  }
}