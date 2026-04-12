import { Test, TestingModule } from '@nestjs/testing';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock PrismaService to prevent @prisma/adapter-mariadb import
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));

describe('RoomsController', () => {
  let controller: RoomsController;

  const mockRoomsService = {
    Create: jest.fn(),
    EditRoom: jest.fn(),
    DeleteRoom: jest.fn(),
    FindAllRooms: jest.fn(),
    FindARoom: jest.fn(),
    Disable: jest.fn(),
    Enable: jest.fn(),
    UploadImage: jest.fn(),
    SearchRooms: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [
        { provide: RoomsService, useValue: mockRoomsService },
      ],
    }).compile();

    controller = module.get<RoomsController>(RoomsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
