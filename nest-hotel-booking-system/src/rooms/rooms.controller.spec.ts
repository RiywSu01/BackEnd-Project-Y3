import { Test, TestingModule } from '@nestjs/testing';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';

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
    UpdateRoomImage: jest.fn(),
    SearchRooms: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        // ThrottlerModule: needed because global ThrottlerGuard wraps all routes
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }]),
        // CacheModule: needed because @UseInterceptors(CacheInterceptor) is on GET endpoints
        // TTL is configured per-endpoint via @CacheTTL() on the controller
        CacheModule.register({ isGlobal: true }),
      ],
      controllers: [RoomsController],
      providers: [
        { provide: RoomsService, useValue: mockRoomsService },
      ],
    }).compile();

    controller = module.get<RoomsController>(RoomsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── FindAllRooms() — cached 60s ────────────────────────────────────────
  describe('FindAllRooms()', () => {
    it('should call roomsService.FindAllRooms and return all rooms', async () => {
      const mockRooms = [
        { id: 1, name: 'Deluxe Room', capacity: 2, price_per_night: 1500, is_active: true },
        { id: 2, name: 'Suite', capacity: 4, price_per_night: 3000, is_active: true },
      ];
      mockRoomsService.FindAllRooms.mockResolvedValue({
        message: 'All rooms have been retrieved successfully.',
        data: mockRooms,
      });

      const result = await controller.FindAllRooms();

      expect(mockRoomsService.FindAllRooms).toHaveBeenCalledTimes(1);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toHaveProperty('name', 'Deluxe Room');
    });
  });

  // ─── FindARoom() — cached 60s ───────────────────────────────────────────
  describe('FindARoom()', () => {
    it('should call roomsService.FindARoom with the correct id', async () => {
      mockRoomsService.FindARoom.mockResolvedValue({
        message: 'Room id:1 has been retrieved successfully.',
        data: { id: 1, name: 'Deluxe Room' },
      });

      const result = await controller.FindARoom(1);

      expect(mockRoomsService.FindARoom).toHaveBeenCalledWith(1);
      expect(result.data).toHaveProperty('id', 1);
    });
  });

  // ─── SearchRooms() — cached 30s ─────────────────────────────────────────
  describe('SearchRooms()', () => {
    it('should call roomsService.SearchRooms with the filter DTO', async () => {
      const filterDto = { capacity: 2 };
      mockRoomsService.SearchRooms.mockResolvedValue({
        message: 'All rooms available for the selected capacity: 2 have been retrieved successfully.',
        data: [{ id: 1, name: 'Deluxe Room', capacity: 2 }],
      });

      const result = await controller.SearchRooms(filterDto as any);

      expect(mockRoomsService.SearchRooms).toHaveBeenCalledWith(filterDto);
      expect(result!.data[0]).toHaveProperty('capacity', 2);
    });
  });

  // ─── Create() — write, no cache ─────────────────────────────────────────
  describe('Create()', () => {
    it('should call roomsService.Create with the correct DTO (no cache applied)', async () => {
      const dto = {
        name: 'Deluxe Room',
        capacity: 2,
        price_per_night: 1500,
        start_date: '2026-01-01T00:00:00Z' as any,
        end_date: '2026-12-31T00:00:00Z' as any,
      };
      mockRoomsService.Create.mockResolvedValue({
        message: 'New Room has been created successfully.',
        data: { id: 1, ...dto },
      });

      const result = await controller.Create(dto as any);

      expect(mockRoomsService.Create).toHaveBeenCalledWith(dto);
      expect(result.message).toContain('created successfully');
    });
  });

  // ─── EditRoom() — write, no cache ───────────────────────────────────────
  describe('EditRoom()', () => {
    it('should call roomsService.EditRoom with id and DTO', async () => {
      mockRoomsService.EditRoom.mockResolvedValue({
        message: 'Room id:1 has been updated successfully.',
        data: { id: 1, name: 'Updated Room' },
      });

      const result = await controller.EditRoom(1, { name: 'Updated Room' } as any);

      expect(mockRoomsService.EditRoom).toHaveBeenCalledWith(1, { name: 'Updated Room' });
      expect(result.message).toContain('updated successfully');
    });
  });

  // ─── DeleteRoom() — write, no cache ─────────────────────────────────────
  describe('DeleteRoom()', () => {
    it('should call roomsService.DeleteRoom with the correct id', async () => {
      mockRoomsService.DeleteRoom.mockResolvedValue({
        message: 'Room id:1 has been deleted successfully.',
      });

      const result = await controller.DeleteRoom(1);

      expect(mockRoomsService.DeleteRoom).toHaveBeenCalledWith(1);
      expect(result.message).toContain('deleted successfully');
    });
  });

  // ─── Disable() ──────────────────────────────────────────────────────────
  describe('Disable()', () => {
    it('should call roomsService.Disable with the correct id', async () => {
      mockRoomsService.Disable.mockResolvedValue({
        message: 'Room id:1 has been deactivated.',
        data: { id: 1, is_active: false },
      });

      const result = await controller.Disable(1);

      expect(mockRoomsService.Disable).toHaveBeenCalledWith(1);
      expect(result.data.is_active).toBe(false);
    });
  });

  // ─── Enable() ───────────────────────────────────────────────────────────
  describe('Enable()', () => {
    it('should call roomsService.Enable with the correct id', async () => {
      mockRoomsService.Enable.mockResolvedValue({
        message: 'Room id:1 has been activated.',
        data: { id: 1, is_active: true },
      });

      const result = await controller.Enable(1);

      expect(mockRoomsService.Enable).toHaveBeenCalledWith(1);
      expect(result.data.is_active).toBe(true);
    });
  });

  // ─── UpdateRoomImage() ──────────────────────────────────────────────────
  describe('UpdateRoomImage()', () => {
    it('should call roomsService.UpdateRoomImage with id and image_url', async () => {
      const dto = { image_url: 'https://example.com/room101.jpg' };
      mockRoomsService.UpdateRoomImage.mockResolvedValue({
        message: 'Image URL updated for room id:1.',
        data: { id: 1, image_url: dto.image_url },
      });

      const result = await controller.UpdateRoomImage(1, dto);

      expect(mockRoomsService.UpdateRoomImage).toHaveBeenCalledWith(1, dto.image_url);
      expect(result.data.image_url).toBe(dto.image_url);
    });
  });
});
