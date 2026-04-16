import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { ThrottlerModule } from '@nestjs/throttler';

// Mock PrismaService to prevent @prisma/adapter-mariadb import
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

describe('BookingsController', () => {
  let controller: BookingsController;

  const mockBookingsService = {
    FindAllBooking: jest.fn(),
    CreateBooking: jest.fn(),
    FindAllMyBooking: jest.fn(),
    FindOneBooking: jest.fn(),
    ChangeBookingStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        // ThrottlerModule: needed because global ThrottlerGuard applies to all routes
        // Bookings endpoints use the default 60 req/60s — no caching applied (data is user-specific)
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }]),
      ],
      controllers: [BookingsController],
      providers: [
        { provide: BookingsService, useValue: mockBookingsService },
      ],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── FindAllBooking() — Admin only, NOT cached (live admin data) ─────────
  describe('FindAllBooking()', () => {
    it('should call bookingsService.FindAllBooking and return all bookings', async () => {
      mockBookingsService.FindAllBooking.mockResolvedValue({
        message: 'All booking in the system have been retrieved successfully.',
        data: [
          { Booking_ID: 1, username: 'john', Room_ID: 1, bookings_status: 'Pending' },
          { Booking_ID: 2, username: 'jane', Room_ID: 2, bookings_status: 'Approved' },
        ],
      });

      const result = await controller.FindAllBooking();

      expect(mockBookingsService.FindAllBooking).toHaveBeenCalledTimes(1);
      expect(result.data).toHaveLength(2);
    });
  });

  // ─── CreateBooking() — User only, protected by JwtAuthGuard + ThrottlerGuard ─
  describe('CreateBooking()', () => {
    it('should call bookingsService.CreateBooking with username from JWT and DTO', async () => {
      const dto = {
        Room_ID: 1,
        check_in: '2026-07-01T14:00:00Z',
        check_out: '2026-07-05T14:00:00Z',
      };

      mockBookingsService.CreateBooking.mockResolvedValue({
        message: 'Your booking has been created successfully.',
        data: { Booking_ID: 1, username: 'john', Room_ID: 1, bookings_status: 'Pending' },
      });

      // @GetUser('username') resolves to the string 'john' from the JWT payload
      const result = await controller.CreateBooking('john', dto as any);

      expect(mockBookingsService.CreateBooking).toHaveBeenCalledWith('john', dto);
      expect(result.data).toHaveProperty('bookings_status', 'Pending');
    });
  });

  // ─── FindAllMyBooking() — User only, NOT cached (per-user data, leakage risk) ─
  describe('FindAllMyBooking()', () => {
    it('should call bookingsService.FindAllMyBooking with the username from JWT', async () => {
      mockBookingsService.FindAllMyBooking.mockResolvedValue({
        message: 'All of your booking have been retrieved successfully.',
        data: [{ Booking_ID: 1, Room_ID: 1, bookings_status: 'Pending' }],
      });

      const result = await controller.FindAllMyBooking('john');

      expect(mockBookingsService.FindAllMyBooking).toHaveBeenCalledWith('john');
      expect(result.data).toHaveLength(1);
    });
  });

  // ─── FindOneBooking() — User only, NOT cached (per-user data) ───────────
  describe('FindOneBooking()', () => {
    it('should call bookingsService.FindOneBooking with id and username', async () => {
      mockBookingsService.FindOneBooking.mockResolvedValue({
        message: 'Your booking id:1 has been retrieved successfully.',
        data: { Booking_ID: 1, Room_ID: 1, bookings_status: 'Approved' },
      });

      // @Param('id') arrives as a string from the URL; controller does +id to convert
      // @GetUser('username') resolves to the string 'john'
      const result = await controller.FindOneBooking('1', 'john');

      expect(mockBookingsService.FindOneBooking).toHaveBeenCalledWith(1, 'john');
      expect(result.data).toHaveProperty('Booking_ID', 1);
    });
  });

  // ─── ChangeBookingStatus() — Admin only, protected by global ThrottlerGuard ─
  describe('ChangeBookingStatus()', () => {
    it('should call bookingsService.ChangeBookingStatus with id and status', async () => {
      mockBookingsService.ChangeBookingStatus.mockResolvedValue({
        message: 'The booking ID:1 status has been changed successfully.',
        data: { Booking_ID: 1, bookings_status: 'Approved' },
      });

      // @Param('id') arrives as a string from the URL; controller does +id to convert to number
      // @Param('status') arrives as bookings_bookings_status enum string
      const result = await controller.ChangeBookingStatus('1', 'Approved' as any);

      expect(mockBookingsService.ChangeBookingStatus).toHaveBeenCalledWith(1, 'Approved');
      expect(result.data.bookings_status).toBe('Approved');
    });
  });
});
