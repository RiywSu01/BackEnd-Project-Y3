// Set env for testing before any imports
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test_hotel';
process.env.JWT_SECRET = 'test-jwt-secret-key';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Rooms Integration Tests', () => {
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

  // Helper: generate JWT for user/admin
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

  // ─── GET /rooms — Public: List all rooms (FR-12) ─────────────────────
  describe('GET /rooms', () => {
    it('should list all rooms without authentication (200)', async () => {
      const rooms = [
        { id: 1, name: 'Room A', capacity: 2, is_active: true },
        { id: 2, name: 'Room B', capacity: 4, is_active: true },
      ];
      mockPrisma.rooms.findMany.mockResolvedValue(rooms);

      const res = await request(app.getHttpServer())
        .get('/rooms')
        .expect(200);

      expect(res.body.data).toHaveLength(2);
    });
  });

  // ─── GET /rooms/:id — Public: Room detail (FR-13) ────────────────────
  describe('GET /rooms/:id', () => {
    it('should return room details (200)', async () => {
      const room = { id: 1, name: 'Deluxe', capacity: 2, price_per_night: 200 };
      mockPrisma.rooms.findUnique.mockResolvedValue(room);

      const res = await request(app.getHttpServer())
        .get('/rooms/1')
        .expect(200);

      expect(res.body.data).toHaveProperty('name', 'Deluxe');
    });

    it('should return 404 if room not found', async () => {
      mockPrisma.rooms.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/rooms/999')
        .expect(404);
    });
  });

  // ─── POST /rooms — Admin: Create room (FR-8) ────────────────────────
  describe('POST /rooms', () => {
    const createRoomDto = {
      name: 'New Suite',
      capacity: 3,
      price_per_night: 250,
      start_date: '2026-01-01T00:00:00Z',
      end_date: '2026-12-31T00:00:00Z',
    };

    it('should create a room as Admin (201)', async () => {
      const token = generateToken('ADMIN', 'admin');
      mockPrisma.rooms.create.mockResolvedValue({ id: 1, ...createRoomDto });

      const res = await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${token}`)
        .send(createRoomDto)
        .expect(201);

      expect(res.body.message).toContain('created successfully');
    });

    it('should return 403 if USER tries to create room', async () => {
      const token = generateToken('USER');

      await request(app.getHttpServer())
        .post('/rooms')
        .set('Authorization', `Bearer ${token}`)
        .send(createRoomDto)
        .expect(403);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/rooms')
        .send(createRoomDto)
        .expect(401);
    });
  });

  // ─── PATCH /rooms/:id/edit — Admin: Edit room (FR-9) ────────────────
  describe('PATCH /rooms/:id/edit', () => {
    it('should update a room as Admin (200)', async () => {
      const token = generateToken('ADMIN', 'admin');
      const existingRoom = { id: 1, name: 'Old', capacity: 2 };
      const updatedRoom = { id: 1, name: 'Updated', capacity: 2 };

      mockPrisma.rooms.findUnique.mockResolvedValue(existingRoom);
      mockPrisma.rooms.update.mockResolvedValue(updatedRoom);

      const res = await request(app.getHttpServer())
        .patch('/rooms/1/edit')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' })
        .expect(200);

      expect(res.body.message).toContain('updated successfully');
    });

    it('should return 403 if USER tries to edit', async () => {
      const token = generateToken('USER');

      await request(app.getHttpServer())
        .patch('/rooms/1/edit')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });
  });

  // ─── PATCH /rooms/:id/disable — Admin: Disable room (FR-10) ─────────
  describe('PATCH /rooms/:id/disable', () => {
    it('should disable a room as Admin (200)', async () => {
      const token = generateToken('ADMIN', 'admin');
      mockPrisma.rooms.findUnique.mockResolvedValue({ id: 1, is_active: true });
      mockPrisma.rooms.update.mockResolvedValue({ id: 1, is_active: false });

      const res = await request(app.getHttpServer())
        .patch('/rooms/1/disable')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.message).toContain('deactivated');
    });
  });

  // ─── PATCH /rooms/:id/enable — Admin: Enable room (FR-10) ───────────
  describe('PATCH /rooms/:id/enable', () => {
    it('should enable a room as Admin (200)', async () => {
      const token = generateToken('ADMIN', 'admin');
      mockPrisma.rooms.findUnique.mockResolvedValue({ id: 1, is_active: false });
      mockPrisma.rooms.update.mockResolvedValue({ id: 1, is_active: true });

      const res = await request(app.getHttpServer())
        .patch('/rooms/1/enable')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.message).toContain('activated');
    });
  });

  // ─── DELETE /rooms/:id/delete — Admin: Delete room (FR-10) ──────────
  describe('DELETE /rooms/:id/delete', () => {
    it('should delete a room as Admin (200)', async () => {
      const token = generateToken('ADMIN', 'admin');
      mockPrisma.rooms.findUnique.mockResolvedValue({ id: 1, name: 'Room' });
      mockPrisma.rooms.delete.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .delete('/rooms/1/delete')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.message).toContain('deleted successfully');
    });

    it('should return 403 if USER tries to delete', async () => {
      const token = generateToken('USER');

      await request(app.getHttpServer())
        .delete('/rooms/1/delete')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  // ─── GET /rooms/search — User: Search rooms (FR-27/28/29) ───────────
  describe('GET /rooms/search', () => {
    it('should search rooms by date range as USER (200)', async () => {
      const token = generateToken('USER');
      mockPrisma.rooms.findMany.mockResolvedValue([{ id: 1, name: 'Available' }]);

      const res = await request(app.getHttpServer())
        .get('/rooms/search')
        .query({
          checkInDate: '2026-06-01T14:00:00Z',
          checkOutDate: '2026-06-05T14:00:00Z',
        })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
    });

    it('should search rooms by capacity as USER (200)', async () => {
      const token = generateToken('USER');
      mockPrisma.rooms.findMany.mockResolvedValue([{ id: 1, capacity: 4 }]);

      const res = await request(app.getHttpServer())
        .get('/rooms/search')
        .query({ capacity: '2' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/rooms/search')
        .query({ capacity: '2' })
        .expect(401);
    });
  });
});
