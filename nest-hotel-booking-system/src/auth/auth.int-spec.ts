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

describe('Auth Integration Tests', () => {
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

  // Helper: generate JWT for a given user
  function generateToken(user: { sub: number; username: string; roles: string }) {
    // Mock the JwtStrategy validation lookup
    mockPrisma.users.findUnique.mockResolvedValue({
      id: user.sub,
      username: user.username,
      userPassword: 'hashed',
      email: `${user.username}@test.com`,
      roles: user.roles,
    });
    return jwtService.sign(user);
  }

  // ─── POST /auth/register ─────────────────────────────────────────────
  describe('POST /auth/register', () => {
    it('should register a new user (201)', async () => {
      mockPrisma.users.findFirst.mockResolvedValue(null);
      mockPrisma.users.create.mockResolvedValue({
        id: 1,
        username: 'newuser',
        userPassword: 'hashed',
        email: 'new@example.com',
        roles: 'USER',
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'newuser', password: 'Pass123!', email: 'new@example.com' })
        .expect(201);

      expect(res.body.message).toContain('registered successfully');
      expect(res.body.data).not.toHaveProperty('userPassword');
    });

    it('should return 409 if username already exists', async () => {
      mockPrisma.users.findFirst.mockResolvedValue({ id: 1 });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: 'existing', password: 'Pass123!', email: 'e@test.com' })
        .expect(409);
    });

    it('should return 400 if required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ username: '', password: '', email: '' })
        .expect(400);
    });
  });

  // ─── POST /auth/login ────────────────────────────────────────────────
  describe('POST /auth/login', () => {
    it('should login and return access_token (201)', async () => {
      const hashedPassword = bcrypt.hashSync('Pass123!', 12);

      mockPrisma.users.findUnique.mockResolvedValue({
        id: 1,
        username: 'testuser',
        userPassword: hashedPassword,
        email: 'test@example.com',
        roles: 'USER',
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'testuser', password: 'Pass123!' })
        .expect(201);

      expect(res.body.message).toBe('Login successful.');
      expect(res.body).toHaveProperty('access_token');
      expect(typeof res.body.access_token).toBe('string');
      expect(res.body.user).not.toHaveProperty('userPassword');
    });

    it('should return 401 if user not found', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'nobody', password: 'Pass123!' })
        .expect(401);
    });

    it('should return 401 if password is wrong', async () => {
      const hashedPassword = bcrypt.hashSync('CorrectPass', 12);

      mockPrisma.users.findUnique.mockResolvedValue({
        id: 1,
        username: 'testuser',
        userPassword: hashedPassword,
        roles: 'USER',
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'testuser', password: 'WrongPass' })
        .expect(401);
    });
  });

  // ─── POST /auth/logout ───────────────────────────────────────────────
  describe('POST /auth/logout', () => {
    it('should logout successfully with valid JWT (201)', async () => {
      const token = generateToken({ sub: 1, username: 'testuser', roles: 'USER' });

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(res.body.message).toBe('Logged out successfully.');
    });

    it('should return 401 without Authorization header', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);
    });
  });
});
