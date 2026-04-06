import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, UploadedFile} from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  // FR-8: Create room
  async Create(createRoomDto: CreateRoomDto) {
    if (!createRoomDto.name || !createRoomDto.capacity || !createRoomDto.price_per_night) {
      throw new BadRequestException('Name, capacity, and price_per_night are required.');
    }
    const result = await this.prisma.rooms.create({ data: createRoomDto });
    return { message: 'New Room has been created successfully.', data: result };
  }

  // FR-9: Edit room (FIXED - was passing class instead of instance)
  async EditRoom(id: number, updateRoomDto: UpdateRoomDto) {
    const room = await this.prisma.rooms.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException(`Room id:${id} not found.`);
    }
    try {
      const result = await this.prisma.rooms.update({
        where: { id },
        data: { ...updateRoomDto, updated_at: new Date() },
      });
      return { message: `Room id:${id} has been updated successfully.`, data: result };
    } catch (error) {
      throw new Error(error);
    }
  }

  // FR-10: Delete room
  async DeleteRoom(id: number) {
    const room = await this.prisma.rooms.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException(`Room id:${id} not found.`);
    }
    await this.prisma.rooms.delete({ where: { id } });
    return { message: `Room id:${id} has been deleted successfully.` };
  }

  // FR-12: List all rooms
  async FindAllRooms() {
    const allRooms = await this.prisma.rooms.findMany();
    if (!allRooms) {
      throw new NotFoundException('No rooms found.');
    }
    return { message: 'All rooms have been retrieved successfully.', data: allRooms };
  }

  // FR-13 + FR-16: Get one room (includes image_url)
  async FindARoom(id: number) {
    const room = await this.prisma.rooms.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException(`Room id:${id} not found.`);
    }
    return { message: `Room id:${id} has been retrieved successfully.`, data: room };
  }

  // FR-10: Disable room
  async Disable(id: number) {
    const room = await this.prisma.rooms.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException(`Room id:${id} not found.`);
    }
    await this.prisma.rooms.update({ where: { id }, data: { is_active: false } });
    return { message: `Room id:${id} has been deactivated.` };
  }

  // FR-10: Enable room
  async Enable(id: number) {
    const room = await this.prisma.rooms.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException(`Room id:${id} not found.`);
    }
    await this.prisma.rooms.update({ where: { id }, data: { is_active: true } });
    return { message: `Room id:${id} has been activated.` };
  }

  // FR-14 + FR-15: Upload and store room image
  async UploadImage(id: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image file provided.');
    }
    const room = await this.prisma.rooms.findUnique({ where: { id } });
    if (!room) {
      throw new NotFoundException(`Room id:${id} not found.`);
    }
    const imageUrl = `/uploads/rooms/${file.filename}`;
    const result = await this.prisma.rooms.update({
      where: { id },
      data: { image_url: imageUrl },
    });
    return { message: `Image uploaded for room id:${id}.`, data: result };
  }
}