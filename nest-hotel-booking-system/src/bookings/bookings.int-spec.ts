// Set env for testing before any imports
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test_hotel';
process.env.JWT_SECRET = 'test-jwt-secret-key';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Bookings Integration Tests', () => {
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

  // ─── POST /bookings/CreateRoom — USER: Create booking ───────────────
  describe('POST /bookings/CreateRoom', () => {
    const mockRoom = {
      id: 1,
      name: 'Room',
      capacity: 2,
      price_per_night: 100,
      start_date: new Date('2026-01-01'),
      end_date: new Date('2026-12-31'),
      is_active: true,
    };

    const bookingDto = {
      Room_ID: 1,
      check_in: '2026-06-01T14:00:00Z',
      check_out: '2026-06-05T14:00:00Z',
    };

    it('should create a booking as USER (201)', async () => {
      const token = generateToken('USER');
      mockPrisma.rooms.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.bookings.findFirst.mockResolvedValue(null);
      mockPrisma.bookings.create.mockResolvedValue({
        Booking_ID: 1,
        Room_ID: 1,
        username: 'testuser',
        check_in: bookingDto.check_in,
        check_out: bookingDto.check_out,
        bookings_status: 'Pending',
      });
      mockPrisma.notifications.create.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .post('/bookings/CreateRoom')
        .set('Authorization', `Bearer ${token}`)
        .send(bookingDto)
        .expect(201);

      expect(res.body.message).toContain('created successfully');
    });

    it('should return 409 if room is already booked', async () => {
      const token = generateToken('USER');
      mockPrisma.rooms.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.bookings.findFirst.mockResolvedValue({ Booking_ID: 99 });

      await request(app.getHttpServer())
        .post('/bookings/CreateRoom')
        .set('Authorization', `Bearer ${token}`)
        .send(bookingDto)
        .expect(409);
    });

    it('should return 400 if check-out is before check-in', async () => {
      const token = generateToken('USER');
      mockPrisma.rooms.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.bookings.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/bookings/CreateRoom')
        .set('Authorization', `Bearer ${token}`)
        .send({
          Room_ID: 1,
          check_in: '2026-06-05T14:00:00Z',
          check_out: '2026-06-01T14:00:00Z',
        })
        .expect(400);
    });

    it('should return 403 if ADMIN tries to create booking', async () => {
      const token = generateToken('ADMIN', 'admin');

      await request(app.getHttpServer())
        .post('/bookings/CreateRoom')
        .set('Authorization', `Bearer ${token}`)
        .send(bookingDto)
        .expect(403);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/bookings/CreateRoom')
        .send(bookingDto)
        .expect(401);
    });
  });

  // ─── GET /bookings/ListAllMyBooking — USER: List own bookings ───────
  describe('GET /bookings/ListAllMyBooking', () => {
    it('should return user bookings (200)', async () => {
      const token = generateToken('USER');
      mockPrisma.bookings.findMany.mockResolvedValue([
        { Booking_ID: 1, Room_ID: 1, username: 'testuser', bookings_status: 'Pending' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/bookings/ListAllMyBooking')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
    });
  });

  // ─── GET /bookings/:id/ListMyBooking — USER: Get one booking ────────
  describe('GET /bookings/:id/ListMyBooking', () => {
    it('should return a specific booking (200)', async () => {
      const token = generateToken('USER');
      const mockBooking = { Booking_ID: 1, Room_ID: 1, username: 'testuser' };
      mockPrisma.bookings.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.bookings.findFirst.mockResolvedValue(mockBooking);

      const res = await request(app.getHttpServer())
        .get('/bookings/1/ListMyBooking')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toHaveProperty('Booking_ID', 1);
    });
  });

  // ─── GET /bookings/ListAllBooking — ADMIN: List all bookings ────────
  describe('GET /bookings/ListAllBooking', () => {
    it('should return all bookings as ADMIN (200)', async () => {
      const token = generateToken('ADMIN', 'admin');
      mockPrisma.bookings.findMany.mockResolvedValue([
        { Booking_ID: 1 },
        { Booking_ID: 2 },
      ]);

      const res = await request(app.getHttpServer())
        .get('/bookings/ListAllBooking')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
    });

    it('should return 403 if USER tries to access all bookings', async () => {
      const token = generateToken('USER');

      await request(app.getHttpServer())
        .get('/bookings/ListAllBooking')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  // ─── PATCH /bookings/:id/:status/ChangeStatus — ADMIN ───────────────
  describe('PATCH /bookings/:id/:status/ChangeStatus', () => {
    it('should change booking status as ADMIN (200)', async () => {
      const token = generateToken('ADMIN', 'admin');
      mockPrisma.bookings.findUnique.mockResolvedValue({
        Booking_ID: 1,
        bookings_status: 'Pending',
        username: 'testuser',
      });
      mockPrisma.bookings.update.mockResolvedValue({
        Booking_ID: 1,
        bookings_status: 'Approved',
        username: 'testuser',
      });

      const res = await request(app.getHttpServer())
        .patch('/bookings/1/Approved/ChangeStatus')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.message).toContain('changed successfully');
    });

    it('should return 403 if USER tries to change status', async () => {
      const token = generateToken('USER');

      await request(app.getHttpServer())
        .patch('/bookings/1/Approved/ChangeStatus')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should handle cancellation and emit event (200)', async () => {
      const token = generateToken('ADMIN', 'admin');
      mockPrisma.bookings.findUnique.mockResolvedValue({
        Booking_ID: 1,
        bookings_status: 'Pending',
        username: 'testuser',
      });
      mockPrisma.bookings.update.mockResolvedValue({
        Booking_ID: 1,
        bookings_status: 'Cancelled',
        username: 'testuser',
      });
      mockPrisma.notifications.create.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .patch('/bookings/1/Cancelled/ChangeStatus')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.bookings_status).toBe('Cancelled');
    });
  });
});
