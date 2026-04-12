import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';

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
      controllers: [BookingsController],
      providers: [
        { provide: BookingsService, useValue: mockBookingsService },
      ],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
