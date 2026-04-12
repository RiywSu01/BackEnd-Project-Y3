import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock the PrismaService module to prevent @prisma/adapter-mariadb import
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    users: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── FR-1: register() ────────────────────────────────────────────────
  describe('register()', () => {
    const registerDto = {
      username: 'testuser',
      password: 'SecureP@ss123',
      email: 'test@example.com',
    };

    it('should register a new user successfully', async () => {
      mockPrisma.users.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockPrisma.users.create.mockResolvedValue({
        id: 1,
        username: 'testuser',
        userPassword: 'hashed_password',
        email: 'test@example.com',
        roles: 'USER',
      });

      const result = await service.register(registerDto);

      expect(result.message).toBe('User registered successfully.');
      expect(result.data).not.toHaveProperty('userPassword');
      expect(result.data).toHaveProperty('username', 'testuser');
      expect(bcrypt.hash).toHaveBeenCalledWith('SecureP@ss123', 12);
      expect(mockPrisma.users.create).toHaveBeenCalledWith({
        data: {
          username: 'testuser',
          userPassword: 'hashed_password',
          email: 'test@example.com',
        },
      });
    });

    it('should hash password with 12 salt rounds', async () => {
      mockPrisma.users.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.users.create.mockResolvedValue({
        id: 1,
        username: 'testuser',
        userPassword: 'hashed',
        email: 'test@example.com',
        roles: 'USER',
      });

      await service.register(registerDto);
      expect(bcrypt.hash).toHaveBeenCalledWith('SecureP@ss123', 12);
    });

    it('should throw ConflictException if username already exists', async () => {
      mockPrisma.users.findFirst.mockResolvedValue({ id: 1, username: 'testuser' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow(
        'Username or email already exists.',
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.users.findFirst.mockResolvedValue({ id: 2, email: 'test@example.com' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if username is empty', async () => {
      await expect(
        service.register({ ...registerDto, username: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if password is empty', async () => {
      await expect(
        service.register({ ...registerDto, password: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if email is empty', async () => {
      await expect(
        service.register({ ...registerDto, email: '' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── FR-2: login() ───────────────────────────────────────────────────
  describe('login()', () => {
    const loginDto = { username: 'testuser', password: 'SecureP@ss123' };

    const mockUser = {
      id: 1,
      username: 'testuser',
      userPassword: 'hashed_password',
      email: 'test@example.com',
      roles: 'USER',
    };

    it('should login successfully and return JWT access token', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt-access-token');

      const result = await service.login(loginDto);

      expect(result.message).toBe('Login successful.');
      expect(result.access_token).toBe('jwt-access-token');
      expect(result.user).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        roles: 'USER',
      });
      // Verify JWT payload structure
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 1,
        username: 'testuser',
        roles: 'USER',
      });
    });

    it('should not include password in login response', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('token');

      const result = await service.login(loginDto);

      expect(result.user).not.toHaveProperty('userPassword');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow(
        'Password is incorrect, please retry again.',
      );
    });

    it('should throw BadRequestException if username is empty', async () => {
      await expect(
        service.login({ ...loginDto, username: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if password is empty', async () => {
      await expect(
        service.login({ ...loginDto, password: '' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── FR-2: logout() ──────────────────────────────────────────────────
  describe('logout()', () => {
    it('should add the token to the blacklist and return success', async () => {
      const result = await service.logout('valid-jwt-token');

      expect(result.message).toBe('Logged out successfully.');
      expect(service.isTokenBlacklisted('valid-jwt-token')).toBe(true);
    });

    it('should throw BadRequestException if token is empty', async () => {
      await expect(service.logout('')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── isTokenBlacklisted() ────────────────────────────────────────────
  describe('isTokenBlacklisted()', () => {
    it('should return false for a non-blacklisted token', () => {
      expect(service.isTokenBlacklisted('unknown-token')).toBe(false);
    });

    it('should return true after the token has been blacklisted via logout', async () => {
      await service.logout('my-token');
      expect(service.isTokenBlacklisted('my-token')).toBe(true);
    });

    it('should track multiple blacklisted tokens independently', async () => {
      await service.logout('token-a');
      await service.logout('token-b');

      expect(service.isTokenBlacklisted('token-a')).toBe(true);
      expect(service.isTokenBlacklisted('token-b')).toBe(true);
      expect(service.isTokenBlacklisted('token-c')).toBe(false);
    });
  });
});
