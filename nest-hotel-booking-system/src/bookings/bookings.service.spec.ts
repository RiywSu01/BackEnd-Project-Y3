import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Mock the PrismaService module to prevent @prisma/adapter-mariadb import
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

describe('BookingsService', () => {
  let service: BookingsService;
  let eventEmitter: EventEmitter2;

  const mockPrisma = {
    bookings: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    rooms: {
      findUnique: jest.fn(),
    },
    notifications: {
      create: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── FindAllBooking() — Admin retrieves all bookings ─────────────────
  describe('FindAllBooking()', () => {
    it('should return all bookings in the system', async () => {
      const mockBookings = [
        { Booking_ID: 1, Room_ID: 1, username: 'user1', bookings_status: 'Pending' },
        { Booking_ID: 2, Room_ID: 2, username: 'user2', bookings_status: 'Approved' },
      ];
      mockPrisma.bookings.findMany.mockResolvedValue(mockBookings);

      const result = await service.FindAllBooking();

      expect(result.message).toContain('retrieved successfully');
      expect(result.data).toHaveLength(2);
      expect(mockPrisma.bookings.findMany).toHaveBeenCalled();
    });
  });

  // ─── CreateBooking() — User creates a booking ────────────────────────
  describe('CreateBooking()', () => {
    const username = 'testuser';

    const mockRoom = {
      id: 1,
      name: 'Deluxe Suite',
      capacity: 2,
      price_per_night: 100,
      start_date: new Date('2026-01-01'),
      end_date: new Date('2026-12-31'),
      is_active: true,
    };

    const validDto = {
      Room_ID: 1,
      check_in: new Date('2026-06-01T14:00:00Z'),
      check_out: new Date('2026-06-05T14:00:00Z'),
    };

    it('should create a booking successfully', async () => {
      const createdBooking = {
        Booking_ID: 1,
        Room_ID: 1,
        username: 'testuser',
        check_in: validDto.check_in,
        check_out: validDto.check_out,
        bookings_status: 'Pending',
      };

      mockPrisma.rooms.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.bookings.findFirst.mockResolvedValue(null); // no existing booking
      mockPrisma.bookings.create.mockResolvedValue(createdBooking);

      const result = await service.CreateBooking(username, validDto);

      expect(result.message).toContain('created successfully');
      expect(result.data).toEqual(createdBooking);
      expect(mockPrisma.bookings.create).toHaveBeenCalled();
    });

    it('should emit booking.created event after creation', async () => {
      const createdBooking = {
        Booking_ID: 1,
        Room_ID: 1,
        username: 'testuser',
        check_in: validDto.check_in,
        check_out: validDto.check_out,
      };

      mockPrisma.rooms.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.bookings.findFirst.mockResolvedValue(null);
      mockPrisma.bookings.create.mockResolvedValue(createdBooking);

      await service.CreateBooking(username, validDto);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'booking.created',
        createdBooking,
      );
    });

    it('should throw NotFoundException if room does not exist', async () => {
      mockPrisma.rooms.findUnique.mockResolvedValue(null);

      await expect(service.CreateBooking(username, validDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if room is already booked', async () => {
      mockPrisma.rooms.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.bookings.findFirst.mockResolvedValue({ Booking_ID: 99 });

      await expect(service.CreateBooking(username, validDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if check-out is before check-in (FR-19)', async () => {
      const invalidDto = {
        Room_ID: 1,
        check_in: new Date('2026-06-05T14:00:00Z'),
        check_out: new Date('2026-06-01T14:00:00Z'),
      };

      mockPrisma.rooms.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.bookings.findFirst.mockResolvedValue(null);

      await expect(service.CreateBooking(username, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.CreateBooking(username, invalidDto)).rejects.toThrow(
        'Check-out date must be after check-in date.',
      );
    });

    it('should throw BadRequestException if check-in equals check-out', async () => {
      const sameDate = new Date('2026-06-01T14:00:00Z');
      const invalidDto = {
        Room_ID: 1,
        check_in: sameDate,
        check_out: sameDate,
      };

      mockPrisma.rooms.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.bookings.findFirst.mockResolvedValue(null);

      await expect(service.CreateBooking(username, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if dates are outside room availability', async () => {
      const outOfRangeDto = {
        Room_ID: 1,
        check_in: new Date('2025-06-01T14:00:00Z'), // before room start_date
        check_out: new Date('2025-06-05T14:00:00Z'),
      };

      mockPrisma.rooms.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.bookings.findFirst.mockResolvedValue(null);

      await expect(service.CreateBooking(username, outOfRangeDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if required fields are missing', async () => {
      const incompleteDto = { Room_ID: 0, check_in: null as any, check_out: null as any };

      await expect(
        service.CreateBooking(username, incompleteDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── FindAllMyBooking() — User retrieves own bookings ────────────────
  describe('FindAllMyBooking()', () => {
    it('should return all bookings for the given user', async () => {
      const mockBookings = [
        { Booking_ID: 1, username: 'testuser', Room_ID: 1 },
        { Booking_ID: 2, username: 'testuser', Room_ID: 2 },
      ];
      mockPrisma.bookings.findMany.mockResolvedValue(mockBookings);

      const result = await service.FindAllMyBooking('testuser');

      expect(result.message).toContain('retrieved successfully');
      expect(result.data).toHaveLength(2);
      expect(mockPrisma.bookings.findMany).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });
  });

  // ─── FindOneBooking() — User retrieves one booking ───────────────────
  describe('FindOneBooking()', () => {
    it('should return a specific booking for the user', async () => {
      const mockBooking = { Booking_ID: 1, username: 'testuser', Room_ID: 1 };
      mockPrisma.bookings.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.bookings.findFirst.mockResolvedValue(mockBooking);

      const result = await service.FindOneBooking(1, 'testuser');

      expect(result.message).toContain('retrieved successfully');
      expect(result.data).toEqual(mockBooking);
    });

    it('should throw NotFoundException if booking not found for user', async () => {
      mockPrisma.bookings.findUnique.mockResolvedValue({ Booking_ID: 1 });
      mockPrisma.bookings.findFirst.mockResolvedValue(null);

      await expect(service.FindOneBooking(1, 'testuser')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── ChangeBookingStatus() — Admin changes booking status (FR-21) ────
  describe('ChangeBookingStatus()', () => {
    const existingBooking = {
      Booking_ID: 1,
      Room_ID: 1,
      username: 'testuser',
      bookings_status: 'Pending',
    };

    it('should change booking status to Approved', async () => {
      const updated = { ...existingBooking, bookings_status: 'Approved' };
      mockPrisma.bookings.findUnique.mockResolvedValue(existingBooking);
      mockPrisma.bookings.update.mockResolvedValue(updated);

      const result = await service.ChangeBookingStatus(1, 'Approved' as any);

      expect(result.message).toContain('changed successfully');
      expect(result.data.bookings_status).toBe('Approved');
    });

    it('should emit booking.cancelled event when status is Cancelled', async () => {
      const cancelled = { ...existingBooking, bookings_status: 'Cancelled' };
      mockPrisma.bookings.findUnique.mockResolvedValue(existingBooking);
      mockPrisma.bookings.update.mockResolvedValue(cancelled);

      await service.ChangeBookingStatus(1, 'Cancelled' as any);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'booking.cancelled',
        cancelled,
      );
    });

    it('should NOT emit booking.cancelled for non-cancel status changes', async () => {
      const approved = { ...existingBooking, bookings_status: 'Approved' };
      mockPrisma.bookings.findUnique.mockResolvedValue(existingBooking);
      mockPrisma.bookings.update.mockResolvedValue(approved);

      await service.ChangeBookingStatus(1, 'Approved' as any);

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if booking ID not found', async () => {
      mockPrisma.bookings.findUnique.mockResolvedValue(null);

      await expect(
        service.ChangeBookingStatus(999, 'Approved' as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if id or status is missing', async () => {
      await expect(
        service.ChangeBookingStatus(0, '' as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Event Handlers (FR-30, FR-31) ───────────────────────────────────
  describe('CreateBookingEvent() — FR-30', () => {
    it('should create a notification when booking is created', async () => {
      const payload = {
        Booking_ID: 1,
        Room_ID: 5,
        username: 'testuser',
        check_in: '2026-06-01T14:00:00Z',
        check_out: '2026-06-05T14:00:00Z',
      };
      mockPrisma.notifications.create.mockResolvedValue({ id: 1 });

      await service.CreateBookingEvent(payload);

      expect(mockPrisma.notifications.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: 'testuser',
          is_read: false,
          message: expect.stringContaining('Room ID:5'),
        }),
      });
    });

    it('should not throw even if notification creation fails', async () => {
      mockPrisma.notifications.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.CreateBookingEvent({
          username: 'testuser',
          Room_ID: 1,
          check_in: '2026-06-01',
          check_out: '2026-06-05',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('CancelBookingEvent() — FR-31', () => {
    it('should create a cancellation notification', async () => {
      const payload = {
        Booking_ID: 10,
        username: 'testuser',
      };
      mockPrisma.notifications.create.mockResolvedValue({ id: 2 });

      await service.CancelBookingEvent(payload);

      expect(mockPrisma.notifications.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: 'testuser',
          is_read: false,
          message: expect.stringContaining('booking ID:10'),
        }),
      });
    });

    it('should not throw even if notification creation fails', async () => {
      mockPrisma.notifications.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.CancelBookingEvent({ Booking_ID: 1, username: 'testuser' }),
      ).resolves.not.toThrow();
    });
  });
});
