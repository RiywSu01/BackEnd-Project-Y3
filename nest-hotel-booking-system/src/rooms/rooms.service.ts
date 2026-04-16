import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, UploadedFile, Logger } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from '../prisma/prisma.service';
import { FilterRoomSearchDto } from './dto/filter-room-search.dto';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);
  constructor(private readonly prisma: PrismaService) { }

  // FR-8: Create room 
  async Create(createRoomDto: CreateRoomDto) {
    this.logger.log(`Creating new room '${createRoomDto.name}'...`);
    // check if the required fields are provided or not
    if (!createRoomDto.name || !createRoomDto.capacity || !createRoomDto.price_per_night || !createRoomDto.start_date || !createRoomDto.end_date) {
      this.logger.warn('Room creation failed: missing required fields');
      throw new BadRequestException('Please make sure you have entered and check the correct format type of the name, capacity, price_per_night correctly, start date and end date and try again.');
    }
    const result = await this.prisma.rooms.create({ data: createRoomDto });
    if (!result) {
      throw new InternalServerErrorException('An error occurred while creating the room.');
    }
    this.logger.log(`Room '${createRoomDto.name}' (id:${result.id}) created successfully`);
    return { message: 'New Room has been created successfully.', data: result };
  }

  // FR-9: Edit room 
  async EditRoom(id: number, updateRoomDto: UpdateRoomDto) {
    this.logger.log(`Editing room id:${id}...`);
    // check if the required fields are provided or not
    if (!id || !updateRoomDto) {
      throw new BadRequestException('Please make sure you have entered the correct room ID and update details and in correct format and try again.');
    }
    const room = await this.prisma.rooms.findUnique({ where: { id } });
    if (!room) {
      this.logger.warn(`Room edit failed: room id:${id} not found`);
      throw new NotFoundException(`Room id:${id} not found.`);
    }
    const result = await this.prisma.rooms.update({
      where: { id },
      data: { ...updateRoomDto, updated_at: new Date() },
    });
    if (!result) {
      throw new InternalServerErrorException(`An error occurred while updating room id:${id}.`);
    }
    this.logger.log(`Room id:${id} updated successfully`);
    return { message: `Room id:${id} has been updated successfully.`, data: result };
  }

  // FR-10: Delete room
  async DeleteRoom(id: number) {
    this.logger.log(`Deleting room id:${id}...`);
    try {
      // check if the required fields are provided or not
      if (!id) {
        throw new BadRequestException('Please make sure you have entered the correct room ID and try again.');
      }
      const room = await this.prisma.rooms.findUnique({ where: { id } });
      if (!room) {
        this.logger.warn(`Room delete failed: room id:${id} not found`);
        throw new NotFoundException(`Room id:${id} not found.`);
      }
      await this.prisma.rooms.delete({ where: { id } });
      this.logger.log(`Room id:${id} deleted successfully`);
      return { message: `Room id:${id} has been deleted successfully.` };
    } catch (error) {
      this.logger.error(`Failed to delete room id:${id}`, error.stack);
      throw new InternalServerErrorException(`An error occurred while deleting room id:${id}.`);
    }
  }

  // FR-12: List all rooms
  async FindAllRooms() {
    this.logger.log('Fetching all rooms...');
    const allRooms = await this.prisma.rooms.findMany();
    // check if there is any room in the system or not
    if (!allRooms) {
      this.logger.warn('No rooms found in the system');
      throw new NotFoundException('No rooms found in the system.');
    }
    this.logger.log(`Retrieved ${allRooms.length} rooms`);
    return { message: 'All rooms have been retrieved successfully.', data: allRooms };
  }

  // FR-13 + FR-16: Get one room (includes image_url)
  async FindARoom(id: number) {
    this.logger.log(`Fetching room id:${id}...`);
    // check if the required fields are provided or not
    if (!id) {
      throw new BadRequestException('Please make sure you have entered the correct room ID and try again.');
    }
    const room = await this.prisma.rooms.findUnique({ where: { id } });
    // check if the room ID exist or not
    if (!room) {
      this.logger.warn(`Room lookup failed: room id:${id} not found`);
      throw new NotFoundException(`Room id:${id} not found.`);
    }
    this.logger.log(`Room id:${id} retrieved successfully`);
    return { message: `Room id:${id} has been retrieved successfully.`, data: room };
  }

  // FR-10: Disable room
  async Disable(id: number) {
    this.logger.log(`Disabling room id:${id}...`);
    // check if the required fields are provided or not
    if (!id) {
      throw new BadRequestException('Please make sure you have entered the correct room ID and try again.');
    }
    const room = await this.prisma.rooms.findUnique({ where: { id } });
    // check if the room ID exist or not
    if (!room) {
      this.logger.warn(`Room disable failed: room id:${id} not found`);
      throw new NotFoundException(`Room id:${id} not found.`);
    }
    const result = await this.prisma.rooms.update({ where: { id }, data: { is_active: false } });
    if (!result) {
      throw new InternalServerErrorException(`An error occurred while disabling room id:${id}.`);
    }
    this.logger.log(`Room id:${id} disabled successfully`);
    return { message: `Room id:${id} has been deactivated.`, data: result };
  }

  // FR-10: Enable room
  async Enable(id: number) {
    this.logger.log(`Enabling room id:${id}...`);
    // check if the required fields are provided or not
    if (!id) {
      throw new BadRequestException('Please make sure you have entered the correct room ID and try again.');
    }
    const room = await this.prisma.rooms.findUnique({ where: { id } });
    // check if the room ID exist or not
    if (!room) {
      this.logger.warn(`Room enable failed: room id:${id} not found`);
      throw new NotFoundException(`Room id:${id} not found.`);
    }
    const result = await this.prisma.rooms.update({ where: { id }, data: { is_active: true } });
    if (!result) {
      throw new InternalServerErrorException(`An error occurred while enabling room id:${id}.`);
    }
    this.logger.log(`Room id:${id} enabled successfully`);
    return { message: `Room id:${id} has been activated.`, data: result };
  }

  // FR-14 + FR-15: Update room image URL
  async UpdateRoomImage(id: number, imageUrl: string) {
    this.logger.log(`Updating image URL for room id:${id}...`);
    try {
      if (!imageUrl) {
        this.logger.warn(`Image update failed for room id:${id}: no URL provided`);
        throw new BadRequestException('No image URL provided.');
      }
      const room = await this.prisma.rooms.findUnique({ where: { id } });
      if (!room) {
        this.logger.warn(`Image update failed: room id:${id} not found`);
        throw new NotFoundException(`Room id:${id} not found.`);
      }
      const result = await this.prisma.rooms.update({
        where: { id },
        data: { image_url: imageUrl, updated_at: new Date() },
      });
      this.logger.log(`Image URL updated for room id:${id} -> ${imageUrl}`);
      return { message: `Image URL updated for room id:${id}.`, data: result };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to update image for room id:${id}`, error.stack);
      throw new InternalServerErrorException(`An error occurred while updating image for room id:${id}.`);
    }
  }

  // FR-27+28+29: The system must allow users to search with query such as date range, date range + active status, capacity.
  async SearchRooms(filterRoomSearchDto: FilterRoomSearchDto) {
    this.logger.log('Searching rooms with filters...');
    //FR-27: search by date range
    if (filterRoomSearchDto.checkInDate != undefined && filterRoomSearchDto.checkOutDate != undefined && filterRoomSearchDto.is_active == undefined) {
      const checkInDate = new Date(filterRoomSearchDto.checkInDate);
      const checkOutDate = new Date(filterRoomSearchDto.checkOutDate);
      // Validate date formats
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        throw new BadRequestException('Invalid date format. Please provide valid check-in and check-out dates.');
      }
      // Validate that check-out date is after check-in date
      if (checkInDate >= checkOutDate) {
        throw new BadRequestException('Check-out date must be after check-in date.');
      }
      const availableRooms = await this.prisma.rooms.findMany({
        where: {
          start_date: { lte: checkInDate },
          end_date: { gte: checkOutDate },
        }
      });
      // check if there is any room available for the selected date range or not
      if (!availableRooms || availableRooms.length === 0) {
        this.logger.warn(`No rooms available for date range: ${checkInDate} to ${checkOutDate}`);
        throw new NotFoundException('No rooms available for the selected date range.');
      }
      this.logger.log(`Found ${availableRooms.length} rooms for date range: ${checkInDate} to ${checkOutDate}`);
      return { message: `All rooms available for the selected date range: ${checkInDate} To ${checkOutDate} have been retrieved successfully.`, data: availableRooms };
    }

    //FR-29: search by date range and is_active status
    else if (filterRoomSearchDto.checkInDate != undefined && filterRoomSearchDto.checkOutDate != undefined && filterRoomSearchDto.is_active != undefined) {
      const checkInDate = new Date(filterRoomSearchDto.checkInDate);
      const checkOutDate = new Date(filterRoomSearchDto.checkOutDate);
      // Validate date formats
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        throw new BadRequestException('Invalid date format. Please provide valid check-in and check-out dates.');
      }
      // Validate that check-out date is after check-in date
      if (checkInDate >= checkOutDate) {
        throw new BadRequestException('Check-out date must be after check-in date.');
      }
      const availableRooms = await this.prisma.rooms.findMany({
        where: {
          is_active: true,
          start_date: { lte: checkInDate },
          end_date: { gte: checkOutDate },
        }
      });
      // check if there is any room available for the selected date range or not
      if (!availableRooms || availableRooms.length === 0) {
        this.logger.warn(`No active rooms available for date range: ${checkInDate} to ${checkOutDate}`);
        throw new NotFoundException('No rooms available for the selected date range.');
      }
      this.logger.log(`Found ${availableRooms.length} active rooms for date range: ${checkInDate} to ${checkOutDate}`);
      return { message: `All rooms on active status available for the selected date range: ${checkInDate} To ${checkOutDate} have been retrieved successfully.`, data: availableRooms };
    }

    //FR-28: filter by capacity
    else if (filterRoomSearchDto.capacity != undefined) {
      const availableRooms = await this.prisma.rooms.findMany({
        where: {
          capacity: { gte: filterRoomSearchDto.capacity },
        }
      });
      // check if there is any room available for the selected capacity or not
      if (!availableRooms || availableRooms.length === 0) {
        this.logger.warn(`No rooms available for capacity: ${filterRoomSearchDto.capacity}`);
        throw new NotFoundException('No rooms available for the selected capacity.');
      }
      this.logger.log(`Found ${availableRooms.length} rooms with capacity >= ${filterRoomSearchDto.capacity}`);
      return { message: `All rooms available for the selected capacity: ${filterRoomSearchDto.capacity} have been retrieved successfully.`, data: availableRooms };
    }
  }

}

