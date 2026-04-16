// Set env for testing before any imports
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test_hotel';
process.env.JWT_SECRET = 'test-jwt-secret-key';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * End-to-End Tests — Full User Flows
 *
 * Flow 1: User Journey
 *   register → login → browse rooms → create booking → list bookings → view profile → logout
 *
 * Flow 2: Admin Journey
 *   login → create room → edit room → list bookings → approve booking → disable room
 */
describe('Hotel Booking API (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let cacheManager: Cache;

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
      // Mock ThrottlerGuard so individual e2e test steps are never rate-limited.
      // Rate limiting behaviour is validated separately in the dedicated
      // 'Caching & Rate Limiting' describe block below.
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.setGlobalPrefix('api');
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    cacheManager = moduleFixture.get(CACHE_MANAGER);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    if (cacheManager) await cacheManager.clear();
  });

  // ─── Helper: setup JWT validation mock ───────────────────────────────
  function setupUserForJwt(user: {
    id: number;
    username: string;
    roles: string;
    email?: string;
  }) {
    mockPrisma.users.findUnique.mockResolvedValue({
      id: user.id,
      username: user.username,
      userPassword: 'hashed',
      email: user.email || `${user.username}@test.com`,
      roles: user.roles,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Flow 1: User Journey
  // ═══════════════════════════════════════════════════════════════════════
  describe('Flow 1: User Journey', () => {
    let userToken: string;
    const testUser = {
      id: 1,
      username: 'john',
      email: 'john@example.com',
      roles: 'USER',
    };

    // Step 1: Register
    it('Step 1 — POST /api/auth/register: should register a new user', async () => {
      mockPrisma.users.findFirst.mockResolvedValue(null);
      mockPrisma.users.create.mockResolvedValue({
        id: 1,
        username: 'john',
        userPassword: 'hashed',
        email: 'john@example.com',
        roles: 'USER',
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          username: 'john',
          password: 'JohnPass123!',
          email: 'john@example.com',
        })
        .expect(201);

      expect(res.body.message).toContain('registered successfully');
      expect(res.body.data).not.toHaveProperty('userPassword');
      expect(res.body.data).toHaveProperty('username', 'john');
    });

    // Step 2: Login
    it('Step 2 — POST /api/auth/login: should login and receive JWT', async () => {
      const hashedPassword = bcrypt.hashSync('JohnPass123!', 12);

      mockPrisma.users.findUnique.mockResolvedValue({
        id: 1,
        username: 'john',
        userPassword: hashedPassword,
        email: 'john@example.com',
        roles: 'USER',
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'john', password: 'JohnPass123!' })
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
      expect(typeof res.body.access_token).toBe('string');
      userToken = res.body.access_token;
    });

    // Step 3: Browse rooms (public)
    it('Step 3 — GET /api/rooms: should list available rooms', async () => {
      mockPrisma.rooms.findMany.mockResolvedValue([
        { id: 1, name: 'Ocean View', capacity: 2, price_per_night: 200, is_active: true },
        { id: 2, name: 'Mountain Suite', capacity: 4, price_per_night: 350, is_active: true },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/rooms')
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('name', 'Ocean View');
    });

    // Step 4: Create a booking
    it('Step 4 — POST /api/bookings/CreateRoom: should create a booking', async () => {
      setupUserForJwt(testUser);
      // Generate a proper token for authentication
      userToken = jwtService.sign({
        sub: testUser.id,
        username: testUser.username,
        roles: testUser.roles,
      });

      mockPrisma.rooms.findUnique.mockResolvedValue({
        id: 1,
        name: 'Ocean View',
        capacity: 2,
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-12-31'),
      });
      mockPrisma.bookings.findFirst.mockResolvedValue(null);
      mockPrisma.bookings.create.mockResolvedValue({
        Booking_ID: 1,
        Room_ID: 1,
        username: 'john',
        check_in: '2026-07-01T14:00:00Z',
        check_out: '2026-07-05T14:00:00Z',
        bookings_status: 'Pending',
      });
      mockPrisma.notifications.create.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .post('/api/bookings/CreateRoom')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          Room_ID: 1,
          check_in: '2026-07-01T14:00:00Z',
          check_out: '2026-07-05T14:00:00Z',
        })
        .expect(201);

      expect(res.body.message).toContain('created successfully');
      expect(res.body.data).toHaveProperty('bookings_status', 'Pending');
    });

    // Step 5: List my bookings
    it('Step 5 — GET /api/bookings/ListAllMyBooking: should show user bookings', async () => {
      setupUserForJwt(testUser);
      userToken = jwtService.sign({
        sub: testUser.id,
        username: testUser.username,
        roles: testUser.roles,
      });

      mockPrisma.bookings.findMany.mockResolvedValue([
        { Booking_ID: 1, Room_ID: 1, username: 'john', bookings_status: 'Pending' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/bookings/ListAllMyBooking')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toHaveProperty('username', 'john');
    });

    // Step 6: View profile
    it('Step 6 — GET /api/user/profile: should return profile without password', async () => {
      setupUserForJwt(testUser);
      userToken = jwtService.sign({
        sub: testUser.id,
        username: testUser.username,
        roles: testUser.roles,
      });

      const res = await request(app.getHttpServer())
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.data).not.toHaveProperty('userPassword');
      expect(res.body.data).toHaveProperty('username', 'john');
    });

    // Step 7: Logout
    it('Step 7 — POST /api/auth/logout: should logout successfully', async () => {
      setupUserForJwt(testUser);
      userToken = jwtService.sign({
        sub: testUser.id,
        username: testUser.username,
        roles: testUser.roles,
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      expect(res.body.message).toBe('Logged out successfully.');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Flow 2: Admin Journey
  // ═══════════════════════════════════════════════════════════════════════
  describe('Flow 2: Admin Journey', () => {
    let adminToken: string;
    const adminUser = {
      id: 2,
      username: 'admin',
      email: 'admin@hotel.com',
      roles: 'ADMIN',
    };

    // Step 1: Admin login
    it('Step 1 — POST /api/auth/login: should login as admin', async () => {
      const hashedPassword = bcrypt.hashSync('AdminPass123!', 12);

      mockPrisma.users.findUnique.mockResolvedValue({
        id: 2,
        username: 'admin',
        userPassword: hashedPassword,
        email: 'admin@hotel.com',
        roles: 'ADMIN',
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'AdminPass123!' })
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body.user.roles).toBe('ADMIN');
      adminToken = res.body.access_token;
    });

    // Step 2: Create a room
    it('Step 2 — POST /api/rooms: should create a new room', async () => {
      setupUserForJwt(adminUser);
      adminToken = jwtService.sign({
        sub: adminUser.id,
        username: adminUser.username,
        roles: adminUser.roles,
      });

      mockPrisma.rooms.create.mockResolvedValue({
        id: 3,
        name: 'Presidential Suite',
        capacity: 6,
        price_per_night: 999,
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-12-31'),
        is_active: true,
      });

      const res = await request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Presidential Suite',
          capacity: 6,
          price_per_night: 999,
          start_date: '2026-01-01T00:00:00Z',
          end_date: '2026-12-31T00:00:00Z',
        })
        .expect(201);

      expect(res.body.message).toContain('created successfully');
      expect(res.body.data).toHaveProperty('name', 'Presidential Suite');
    });

    // Step 3: Verify room appears in listing
    it('Step 3 — GET /api/rooms: should show the newly created room', async () => {
      mockPrisma.rooms.findMany.mockResolvedValue([
        { id: 1, name: 'Ocean View' },
        { id: 3, name: 'Presidential Suite' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/rooms')
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      const names = res.body.data.map((r: any) => r.name);
      expect(names).toContain('Presidential Suite');
    });

    // Step 4: Edit the room
    it('Step 4 — PATCH /api/rooms/:id/edit: should edit the room', async () => {
      setupUserForJwt(adminUser);
      adminToken = jwtService.sign({
        sub: adminUser.id,
        username: adminUser.username,
        roles: adminUser.roles,
      });

      mockPrisma.rooms.findUnique.mockResolvedValue({
        id: 3,
        name: 'Presidential Suite',
        capacity: 6,
      });
      mockPrisma.rooms.update.mockResolvedValue({
        id: 3,
        name: 'Royal Presidential Suite',
        capacity: 8,
      });

      const res = await request(app.getHttpServer())
        .patch('/api/rooms/3/edit')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Royal Presidential Suite', capacity: 8 })
        .expect(200);

      expect(res.body.message).toContain('updated successfully');
    });

    // Step 5: View all bookings
    it('Step 5 — GET /api/bookings/ListAllBooking: should list all bookings', async () => {
      setupUserForJwt(adminUser);
      adminToken = jwtService.sign({
        sub: adminUser.id,
        username: adminUser.username,
        roles: adminUser.roles,
      });

      mockPrisma.bookings.findMany.mockResolvedValue([
        { Booking_ID: 1, Room_ID: 1, username: 'john', bookings_status: 'Pending' },
        { Booking_ID: 2, Room_ID: 3, username: 'jane', bookings_status: 'Pending' },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/bookings/ListAllBooking')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
    });

    // Step 6: Approve a booking
    it('Step 6 — PATCH /bookings/:id/Approved/ChangeStatus: should approve booking', async () => {
      setupUserForJwt(adminUser);
      adminToken = jwtService.sign({
        sub: adminUser.id,
        username: adminUser.username,
        roles: adminUser.roles,
      });

      mockPrisma.bookings.findUnique.mockResolvedValue({
        Booking_ID: 1,
        bookings_status: 'Pending',
        username: 'john',
      });
      mockPrisma.bookings.update.mockResolvedValue({
        Booking_ID: 1,
        bookings_status: 'Approved',
        username: 'john',
      });

      const res = await request(app.getHttpServer())
        .patch('/api/bookings/1/Approved/ChangeStatus')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.bookings_status).toBe('Approved');
    });

    // Step 7: Disable a room
    it('Step 7 — PATCH /api/rooms/:id/disable: should disable the room', async () => {
      setupUserForJwt(adminUser);
      adminToken = jwtService.sign({
        sub: adminUser.id,
        username: adminUser.username,
        roles: adminUser.roles,
      });

      mockPrisma.rooms.findUnique.mockResolvedValue({ id: 3, is_active: true });
      mockPrisma.rooms.update.mockResolvedValue({ id: 3, is_active: false });

      const res = await request(app.getHttpServer())
        .patch('/api/rooms/3/disable')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.message).toContain('deactivated');
      expect(res.body.data.is_active).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Cross-cutting: Authorization enforcement
  // ═══════════════════════════════════════════════════════════════════════
  describe('Authorization enforcement', () => {
    it('USER cannot access admin-only booking list', async () => {
      setupUserForJwt({ id: 1, username: 'john', roles: 'USER' });
      const token = jwtService.sign({ sub: 1, username: 'john', roles: 'USER' });

      await request(app.getHttpServer())
        .get('/api/bookings/ListAllBooking')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('USER cannot create a room', async () => {
      setupUserForJwt({ id: 1, username: 'john', roles: 'USER' });
      const token = jwtService.sign({ sub: 1, username: 'john', roles: 'USER' });

      await request(app.getHttpServer())
        .post('/api/rooms')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test', capacity: 1, price_per_night: 50, start_date: '2026-01-01T00:00:00Z', end_date: '2026-12-31T00:00:00Z' })
        .expect(403);
    });

    it('Unauthenticated user cannot access protected endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/user/profile')
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/bookings/ListAllMyBooking')
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .expect(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Caching & Rate Limiting
  // ═══════════════════════════════════════════════════════════════════════
  describe('Caching & Rate Limiting', () => {
    /**
     * CACHING
     * CacheInterceptor is applied to GET /api/rooms (60s TTL) and GET /api/rooms/:id (60s)
     * and GET /api/rooms/search (30s). Booking and user endpoints are NOT cached
     * to avoid per-user data leakage via the shared URL-based cache key.
     */
    it('GET /api/rooms responds successfully (caching enabled — CacheInterceptor + 60s TTL)', async () => {
      mockPrisma.rooms.findMany.mockResolvedValue([
        { id: 1, name: 'Ocean View', capacity: 2, price_per_night: 200, is_active: true },
      ]);

      // First request — cold, populates cache
      const res1 = await request(app.getHttpServer())
        .get('/api/rooms')
        .expect(200);

      expect(res1.body.data).toHaveLength(1);

      // Second request — should be served from cache (DB mock will NOT be called again)
      mockPrisma.rooms.findMany.mockClear();
      const res2 = await request(app.getHttpServer())
        .get('/api/rooms')
        .expect(200);

      expect(res2.body.data).toHaveLength(1);
      // If cache is working, findMany was not called for the second request
      expect(mockPrisma.rooms.findMany).not.toHaveBeenCalled();
    });

    it('GET /api/bookings/ListAllBooking is NOT cached — each call hits the DB (admin live data)', async () => {
      setupUserForJwt({ id: 2, username: 'admin', roles: 'ADMIN' });
      const token = jwtService.sign({ sub: 2, username: 'admin', roles: 'ADMIN' });

      mockPrisma.bookings.findMany.mockResolvedValue([
        { Booking_ID: 1, username: 'john', bookings_status: 'Pending' },
      ]);

      await request(app.getHttpServer())
        .get('/api/bookings/ListAllBooking')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Second call — if cached it would not call findMany again;
      // since it is NOT cached, findMany must be called again
      const callsBefore = mockPrisma.bookings.findMany.mock.calls.length;
      await request(app.getHttpServer())
        .get('/api/bookings/ListAllBooking')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockPrisma.bookings.findMany.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    /**
     * RATE LIMITING
     * ThrottlerGuard is mocked to allow: all above e2e steps in this file.
     * Below we spin up a SEPARATE app without the mock to verify the REAL guard.
     */
    it('POST /api/auth/login has strict @Throttle() — 10 req/60s limit (brute-force protection)', async () => {
      // Build a second app instance WITHOUT the ThrottlerGuard mock
      const strictModule: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue(mockPrisma)
        .compile();

      const strictApp = strictModule.createNestApplication();
      strictApp.useGlobalPipes(new ValidationPipe({ transform: true }));
      strictApp.setGlobalPrefix('api');
      await strictApp.init();

      // Send 12 rapid login attempts — first 10 should pass (400/401), rest should be 429
      const statuses: number[] = [];
      for (let i = 0; i < 12; i++) {
        const res = await request(strictApp.getHttpServer())
          .post('/api/auth/login')
          .send({ username: 'attacker', password: 'wrongpass' });
        statuses.push(res.status);
      }

      const has429 = statuses.some(s => s === 429);
      expect(has429).toBe(true);

      await strictApp.close();
    });

    it('GET /api/health has @SkipThrottle() — never returns 429 regardless of request volume', async () => {
      // Build a second app instance WITHOUT the ThrottlerGuard mock
      const strictModule: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue(mockPrisma)
        .compile();

      const strictApp = strictModule.createNestApplication();
      strictApp.setGlobalPrefix('api');
      await strictApp.init();

      // Send 25 rapid health check requests — none should return 429
      const statuses: number[] = [];
      for (let i = 0; i < 25; i++) {
        const res = await request(strictApp.getHttpServer()).get('/api/health');
        statuses.push(res.status);
      }

      const has429 = statuses.some(s => s === 429);
      expect(has429).toBe(false);

      await strictApp.close();
    });
  });
});
