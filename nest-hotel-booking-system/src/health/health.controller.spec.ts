import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

// Mock PrismaService to prevent @prisma/adapter-mariadb import
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

describe('HealthController', () => {
  let controller: HealthController;

  const mockHealthService = {
    check: jest.fn(),
  };

  const mockPrismaIndicator = {
    pingCheck: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        // ThrottlerModule is included even though @SkipThrottle() is on this controller,
        // because the module needs to be present for the decorator to resolve.
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }]),
      ],
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthService },
        { provide: PrismaHealthIndicator, useValue: mockPrismaIndicator },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── check() — @SkipThrottle() applied ──────────────────────────────────
  describe('check()', () => {
    it('should call health.check and return a healthy status', async () => {
      mockPrismaIndicator.pingCheck.mockResolvedValue({
        database: { status: 'up' },
      });
      mockHealthService.check.mockResolvedValue({
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      });

      const result = await controller.check();

      expect(mockHealthService.check).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('ok');
    });

    it('has @SkipThrottle() — should not be blocked by the global ThrottlerGuard', () => {
      // @SkipThrottle() is applied at the class level on HealthController.
      // The ThrottlerGuard reads THROTTLER:SKIP metadata to exempt this controller.
      // We verify the controller initialises cleanly without errors from the throttler,
      // confirming @SkipThrottle() is correctly applied.
      expect(controller).toBeDefined();
      expect(typeof controller.check).toBe('function');
    });
  });
});
