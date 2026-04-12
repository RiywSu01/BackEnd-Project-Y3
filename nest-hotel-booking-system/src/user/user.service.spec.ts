import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock the PrismaService module to prevent @prisma/adapter-mariadb import
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;

  const mockPrisma = {
    users: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── FR-3: GetProfile() ──────────────────────────────────────────────
  describe('GetProfile()', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      userPassword: 'hashed_secret',
      email: 'test@example.com',
      roles: 'USER',
    };

    it('should return user profile without password', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(mockUser);

      const result = await service.GetProfile('testuser');

      expect(result.message).toContain('Successfully retrieved profile');
      expect(result.data).not.toHaveProperty('userPassword');
      expect(result.data).toHaveProperty('username', 'testuser');
      expect(result.data).toHaveProperty('email', 'test@example.com');
      expect(result.data).toHaveProperty('roles', 'USER');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(null);

      await expect(service.GetProfile('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── FR-4: UpdateProfile() ───────────────────────────────────────────
  describe('UpdateProfile()', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      userPassword: 'hashed',
      email: 'test@example.com',
      roles: 'USER',
    };

    it('should update profile successfully', async () => {
      const updateDto = { email: 'new@example.com' };
      const updatedUser = { ...mockUser, email: 'new@example.com' };

      mockPrisma.users.findUnique.mockResolvedValue(mockUser);
      mockPrisma.users.findFirst.mockResolvedValue(null); // no email conflict
      mockPrisma.users.update.mockResolvedValue(updatedUser);

      const result = await service.UpdateProfile('testuser', updateDto);

      expect(result.message).toContain('updated successfully');
      expect(result.data).not.toHaveProperty('userPassword');
      expect(result.data.email).toBe('new@example.com');
    });

    it('should update username successfully', async () => {
      const updateDto = { username: 'newusername' };
      const updatedUser = { ...mockUser, username: 'newusername' };

      mockPrisma.users.findUnique
        .mockResolvedValueOnce(mockUser)    // find original user
        .mockResolvedValueOnce(null);       // username not taken
      mockPrisma.users.update.mockResolvedValue(updatedUser);

      const result = await service.UpdateProfile('testuser', updateDto);

      expect(result.data.username).toBe('newusername');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(null);

      await expect(
        service.UpdateProfile('nonexistent', { email: 'new@test.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new username is already taken', async () => {
      mockPrisma.users.findUnique
        .mockResolvedValueOnce(mockUser)              // find original user
        .mockResolvedValueOnce({ id: 2, username: 'taken' }); // username exists

      await expect(
        service.UpdateProfile('testuser', { username: 'taken' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if new email is already in use', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(mockUser);
      mockPrisma.users.findFirst.mockResolvedValue({ id: 2, email: 'taken@test.com' });

      await expect(
        service.UpdateProfile('testuser', { email: 'taken@test.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should skip conflict check if username is not changing', async () => {
      const updateDto = { username: 'testuser' }; // same as current
      mockPrisma.users.findUnique.mockResolvedValue(mockUser);
      mockPrisma.users.update.mockResolvedValue(mockUser);

      const result = await service.UpdateProfile('testuser', updateDto);

      // Should NOT check for username conflict since it's the same
      expect(result.message).toContain('updated successfully');
    });
  });

  // ─── changePassword() ────────────────────────────────────────────────
  describe('changePassword()', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      userPassword: 'old_hashed',
      email: 'test@example.com',
    };

    it('should change password successfully', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed');
      mockPrisma.users.update.mockResolvedValue({});

      const result = await service.changePassword('testuser', {
        oldPassword: 'OldPass123',
        newPassword: 'NewPass456',
      });

      expect(result.message).toBe('Password changed successfully.');
      expect(bcrypt.compare).toHaveBeenCalledWith('OldPass123', 'old_hashed');
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass456', 12);
      expect(mockPrisma.users.update).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        data: { userPassword: 'new_hashed' },
      });
    });

    it('should throw BadRequestException if old password is wrong', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('testuser', {
          oldPassword: 'WrongPass',
          newPassword: 'NewPass456',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.changePassword('testuser', {
          oldPassword: 'WrongPass',
          newPassword: 'NewPass456',
        }),
      ).rejects.toThrow('Old password is incorrect.');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', {
          oldPassword: 'OldPass',
          newPassword: 'NewPass',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should hash new password with 12 salt rounds', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.users.update.mockResolvedValue({});

      await service.changePassword('testuser', {
        oldPassword: 'Old',
        newPassword: 'New',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('New', 12);
    });
  });
});
