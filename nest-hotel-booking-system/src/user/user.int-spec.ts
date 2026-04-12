// Set env for testing before any imports
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test_hotel';
process.env.JWT_SECRET = 'test-jwt-secret-key';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('User Integration Tests', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  // ─── Mock PrismaService ──────────────────────────────────────────────
  const mockPrisma = {
    users: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    rooms: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    bookings: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    notifications: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper: generate JWT
  function generateToken(role: 'USER' | 'ADMIN', username = 'testuser') {
    mockPrisma.users.findUnique.mockResolvedValue({
      id: 1,
      username,
      userPassword: 'hashed',
      email: `${username}@test.com`,
      roles: role,
    });
    return jwtService.sign({ sub: 1, username, roles: role });
  }

  // ─── GET /user/profile — View own profile (FR-3) ────────────────────
  describe('GET /user/profile', () => {
    it('should return user profile without password (200)', async () => {
      const token = generateToken('USER');
      // The profile lookup happens after JWT validation
      mockPrisma.users.findUnique.mockResolvedValue({
        id: 1,
        username: 'testuser',
        userPassword: 'hashed_secret',
        email: 'testuser@test.com',
        roles: 'USER',
      });

      const res = await request(app.getHttpServer())
        .get('/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.message).toContain('Successfully retrieved profile');
      expect(res.body.data).not.toHaveProperty('userPassword');
      expect(res.body.data).toHaveProperty('username', 'testuser');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/user/profile')
        .expect(401);
    });

    it('should work for ADMIN role too (200)', async () => {
      const token = generateToken('ADMIN', 'admin');
      mockPrisma.users.findUnique.mockResolvedValue({
        id: 2,
        username: 'admin',
        userPassword: 'hashed',
        email: 'admin@test.com',
        roles: 'ADMIN',
      });

      const res = await request(app.getHttpServer())
        .get('/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toHaveProperty('username', 'admin');
    });
  });

  // ─── PATCH /user/update-profile — Update own profile (FR-4) ─────────
  describe('PATCH /user/update-profile', () => {
    it('should update email successfully (200)', async () => {
      const token = generateToken('USER');
      const currentUser = {
        id: 1,
        username: 'testuser',
        userPassword: 'hashed',
        email: 'old@test.com',
        roles: 'USER',
      };

      // First call: JWT validation, Second call: find user for update
      mockPrisma.users.findUnique.mockResolvedValue(currentUser);
      mockPrisma.users.findFirst.mockResolvedValue(null); // no email conflict
      mockPrisma.users.update.mockResolvedValue({
        ...currentUser,
        email: 'new@test.com',
      });

      const res = await request(app.getHttpServer())
        .patch('/user/update-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@test.com' })
        .expect(200);

      expect(res.body.message).toContain('updated successfully');
      expect(res.body.data).not.toHaveProperty('userPassword');
    });

    it('should return 409 if email is already taken', async () => {
      const token = generateToken('USER');
      mockPrisma.users.findUnique.mockResolvedValue({
        id: 1,
        username: 'testuser',
        userPassword: 'hashed',
        email: 'old@test.com',
        roles: 'USER',
      });
      mockPrisma.users.findFirst.mockResolvedValue({ id: 2, email: 'taken@test.com' });

      await request(app.getHttpServer())
        .patch('/user/update-profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'taken@test.com' })
        .expect(409);
    });
  });

  // ─── PATCH /user/change-password ─────────────────────────────────────
  describe('PATCH /user/change-password', () => {
    it('should change password successfully (200)', async () => {
      const token = generateToken('USER');
      const hashed = bcrypt.hashSync('OldPass123', 12);

      mockPrisma.users.findUnique.mockResolvedValue({
        id: 1,
        username: 'testuser',
        userPassword: hashed,
        email: 'test@test.com',
        roles: 'USER',
      });
      mockPrisma.users.update.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .patch('/user/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: 'OldPass123', newPassword: 'NewPass456' })
        .expect(200);

      expect(res.body.message).toBe('Password changed successfully.');
    });

    it('should return 400 if old password is wrong', async () => {
      const token = generateToken('USER');
      const hashed = bcrypt.hashSync('CorrectPassword', 12);

      mockPrisma.users.findUnique.mockResolvedValue({
        id: 1,
        username: 'testuser',
        userPassword: hashed,
        email: 'test@test.com',
        roles: 'USER',
      });

      await request(app.getHttpServer())
        .patch('/user/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: 'WrongPassword', newPassword: 'NewPass456' })
        .expect(400);
    });
  });
});
