import { Test, TestingModule } from '@nestjs/testing';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock the PrismaService module to prevent @prisma/adapter-mariadb import
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: jest.fn().mockImplementation(() => ({})),
}));
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

describe('RoomsService', () => {
  let service: RoomsService;

  const mockPrisma = {
    rooms: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── FR-8: Create() ──────────────────────────────────────────────────
  describe('Create()', () => {
    const createDto = {
      name: 'Deluxe Suite',
      capacity: 2,
      price_per_night: 150.00,
      start_date: new Date('2026-01-01'),
      end_date: new Date('2026-12-31'),
    };

    it('should create a room successfully', async () => {
      const created = { id: 1, ...createDto, is_active: true, image_url: 'placeholder.png' };
      mockPrisma.rooms.create.mockResolvedValue(created);

      const result = await service.Create(createDto as any);

      expect(result.message).toContain('created successfully');
      expect(result.data).toEqual(created);
      expect(mockPrisma.rooms.create).toHaveBeenCalledWith({ data: createDto });
    });

    it('should throw BadRequestException if name is missing', async () => {
      await expect(
        service.Create({ ...createDto, name: '' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if capacity is missing', async () => {
      await expect(
        service.Create({ ...createDto, capacity: 0 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if price_per_night is missing', async () => {
      await expect(
        service.Create({ ...createDto, price_per_night: 0 } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── FR-9: EditRoom() ────────────────────────────────────────────────
  describe('EditRoom()', () => {
    const existingRoom = {
      id: 1,
      name: 'Standard Room',
      capacity: 2,
      price_per_night: 100,
      is_active: true,
    };

    it('should update a room successfully', async () => {
      const updateDto = { name: 'Premium Room' };
      const updated = { ...existingRoom, name: 'Premium Room' };

      mockPrisma.rooms.findUnique.mockResolvedValue(existingRoom);
      mockPrisma.rooms.update.mockResolvedValue(updated);

      const result = await service.EditRoom(1, updateDto as any);

      expect(result.message).toContain('updated successfully');
      expect(result.data.name).toBe('Premium Room');
    });

    it('should throw NotFoundException if room not found', async () => {
      mockPrisma.rooms.findUnique.mockResolvedValue(null);

      await expect(
        service.EditRoom(999, { name: 'New Name' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should pass updated_at in the update data', async () => {
      mockPrisma.rooms.findUnique.mockResolvedValue(existingRoom);
      mockPrisma.rooms.update.mockResolvedValue(existingRoom);

      await service.EditRoom(1, { name: 'Updated' } as any);

      expect(mockPrisma.rooms.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ updated_at: expect.any(Date) }),
      });
    });
  });

  // ─── FR-10: DeleteRoom() ─────────────────────────────────────────────
  describe('DeleteRoom()', () => {
    it('should delete a room successfully', async () => {
      mockPrisma.rooms.findUnique.mockResolvedValue({ id: 1, name: 'Room' });
      mockPrisma.rooms.delete.mockResolvedValue({});

      const result = await service.DeleteRoom(1);

      expect(result.message).toContain('deleted successfully');
      expect(mockPrisma.rooms.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw error if room not found', async () => {
      mockPrisma.rooms.findUnique.mockResolvedValue(null);

      await expect(service.DeleteRoom(999)).rejects.toThrow();
    });
  });

  // ─── FR-12: FindAllRooms() ───────────────────────────────────────────
  describe('FindAllRooms()', () => {
    it('should return all rooms', async () => {
      const rooms = [
        { id: 1, name: 'Room A' },
        { id: 2, name: 'Room B' },
      ];
      mockPrisma.rooms.findMany.mockResolvedValue(rooms);

      const result = await service.FindAllRooms();

      expect(result.message).toContain('retrieved successfully');
      expect(result.data).toHaveLength(2);
    });
  });

  // ─── FR-13: FindARoom() ──────────────────────────────────────────────
  describe('FindARoom()', () => {
    it('should return a room by id', async () => {
      const room = { id: 1, name: 'Suite', capacity: 4 };
      mockPrisma.rooms.findUnique.mockResolvedValue(room);

      const result = await service.FindARoom(1);

      expect(result.message).toContain('retrieved successfully');
      expect(result.data).toEqual(room);
    });

    it('should throw NotFoundException if room not found', async () => {
      mockPrisma.rooms.findUnique.mockResolvedValue(null);

      await expect(service.FindARoom(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── FR-10: Disable() ────────────────────────────────────────────────
  describe('Disable()', () => {
    it('should deactivate a room', async () => {
      const room = { id: 1, name: 'Room', is_active: true };
      const disabled = { ...room, is_active: false };

      mockPrisma.rooms.findUnique.mockResolvedValue(room);
      mockPrisma.rooms.update.mockResolvedValue(disabled);

      const result = await service.Disable(1);

      expect(result.message).toContain('deactivated');
      expect(result.data.is_active).toBe(false);
      expect(mockPrisma.rooms.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { is_active: false },
      });
    });

    it('should throw NotFoundException if room not found', async () => {
      mockPrisma.rooms.findUnique.mockResolvedValue(null);

      await expect(service.Disable(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── FR-10: Enable() ─────────────────────────────────────────────────
  describe('Enable()', () => {
    it('should activate a room', async () => {
      const room = { id: 1, name: 'Room', is_active: false };
      const enabled = { ...room, is_active: true };

      mockPrisma.rooms.findUnique.mockResolvedValue(room);
      mockPrisma.rooms.update.mockResolvedValue(enabled);

      const result = await service.Enable(1);

      expect(result.message).toContain('activated');
      expect(result.data.is_active).toBe(true);
    });

    it('should throw NotFoundException if room not found', async () => {
      mockPrisma.rooms.findUnique.mockResolvedValue(null);

      await expect(service.Enable(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── FR-27: SearchRooms() — by date range ────────────────────────────
  describe('SearchRooms()', () => {
    describe('FR-27: search by date range', () => {
      it('should return rooms available for the given dates', async () => {
        const rooms = [{ id: 1, name: 'Available Room' }];
        mockPrisma.rooms.findMany.mockResolvedValue(rooms);

        const result = await service.SearchRooms({
          checkInDate: new Date('2026-06-01'),
          checkOutDate: new Date('2026-06-05'),
        } as any);

        expect(result!.message).toContain('retrieved successfully');
        expect(result!.data).toHaveLength(1);
      });

      it('should throw NotFoundException if no rooms available', async () => {
        mockPrisma.rooms.findMany.mockResolvedValue([]);

        await expect(
          service.SearchRooms({
            checkInDate: new Date('2026-06-01'),
            checkOutDate: new Date('2026-06-05'),
          } as any),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw BadRequestException if check-out is before check-in', async () => {
        await expect(
          service.SearchRooms({
            checkInDate: new Date('2026-06-05'),
            checkOutDate: new Date('2026-06-01'),
          } as any),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('FR-29: search by date range + active status', () => {
      it('should return active rooms for the given dates', async () => {
        const rooms = [{ id: 1, name: 'Active Room', is_active: true }];
        mockPrisma.rooms.findMany.mockResolvedValue(rooms);

        const result = await service.SearchRooms({
          checkInDate: new Date('2026-06-01'),
          checkOutDate: new Date('2026-06-05'),
          is_active: true,
        } as any);

        expect(result!.data).toHaveLength(1);
        // Verify query includes is_active filter
        expect(mockPrisma.rooms.findMany).toHaveBeenCalledWith({
          where: expect.objectContaining({ is_active: true }),
        });
      });
    });

    describe('FR-28: search by capacity', () => {
      it('should return rooms with sufficient capacity', async () => {
        const rooms = [
          { id: 1, name: 'Big Room', capacity: 4 },
          { id: 2, name: 'Bigger Room', capacity: 6 },
        ];
        mockPrisma.rooms.findMany.mockResolvedValue(rooms);

        const result = await service.SearchRooms({ capacity: 3 } as any);

        expect(result!.data).toHaveLength(2);
        expect(mockPrisma.rooms.findMany).toHaveBeenCalledWith({
          where: { capacity: { gte: 3 } },
        });
      });

      it('should throw NotFoundException if no rooms match capacity', async () => {
        mockPrisma.rooms.findMany.mockResolvedValue([]);

        await expect(
          service.SearchRooms({ capacity: 100 } as any),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ─── FR-14+15: UpdateRoomImage() ─────────────────────────────────────
  describe('UpdateRoomImage()', () => {
    it('should update room image URL successfully', async () => {
      const room = { id: 1, name: 'Room', image_url: 'placeholder.png' };
      const newImageUrl = 'https://example.com/new-room.jpg';

      mockPrisma.rooms.findUnique.mockResolvedValue(room);
      mockPrisma.rooms.update.mockResolvedValue({
        ...room,
        image_url: newImageUrl,
      });

      const result = await service.UpdateRoomImage(1, newImageUrl);

      expect(result.message).toContain('Image URL updated');
      expect(result.data.image_url).toBe(newImageUrl);
    });

    it('should throw error if no URL provided', async () => {
      await expect(service.UpdateRoomImage(1, '')).rejects.toThrow();
    });
  });
});
