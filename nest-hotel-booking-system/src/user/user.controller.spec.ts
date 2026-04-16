import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ThrottlerModule } from '@nestjs/throttler';

// Mock PrismaService to prevent @prisma/adapter-mariadb import
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

describe('UserController', () => {
  let controller: UserController;

  const mockUserService = {
    GetProfile: jest.fn(),
    UpdateProfile: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        // ThrottlerModule: needed because global ThrottlerGuard applies to all routes.
        // User endpoints use the default 60 req/60s.
        // NOTE: GetProfile is NOT cached — per-user data would leak between users
        //       if the default URL-based cache key was used.
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }]),
      ],
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── GetProfile() — per-user, NOT cached (data leakage risk) ────────────
  describe('GetProfile()', () => {
    it('should call userService.GetProfile with username from JWT and return profile without password', async () => {
      mockUserService.GetProfile.mockResolvedValue({
        message: 'Profile retrieved successfully.',
        data: { id: 1, username: 'john', email: 'john@test.com', roles: 'USER' },
      });

      // @GetUser('username') extracts the string from the JWT payload—
      // in unit tests we call the method directly with the resolved value
      const result = await controller.GetProfile('john');

      expect(mockUserService.GetProfile).toHaveBeenCalledWith('john');
      expect(result.data).not.toHaveProperty('userPassword');
      expect(result.data).toHaveProperty('username', 'john');
    });
  });

  // ─── UpdateProfile() — write operation, NOT cached ──────────────────────
  describe('UpdateProfile()', () => {
    it('should call userService.UpdateProfile with username and DTO', async () => {
      const dto = { email: 'newemail@test.com' };

      mockUserService.UpdateProfile.mockResolvedValue({
        message: 'Profile updated successfully.',
        data: { id: 1, username: 'john', email: 'newemail@test.com' },
      });

      const result = await controller.UpdateProfile('john', dto as any);

      expect(mockUserService.UpdateProfile).toHaveBeenCalledWith('john', dto);
      expect(result.data.email).toBe('newemail@test.com');
    });
  });

  // ─── changePassword() — write operation, NOT cached ─────────────────────
  describe('changePassword()', () => {
    it('should call userService.changePassword with username and DTO', async () => {
      const dto = { currentPassword: 'OldPass123!', newPassword: 'NewPass456!' };

      mockUserService.changePassword.mockResolvedValue({
        message: 'Password changed successfully.',
      });

      const result = await controller.changePassword('john', dto as any);

      expect(mockUserService.changePassword).toHaveBeenCalledWith('john', dto);
      expect(result.message).toBe('Password changed successfully.');
    });
  });
});
