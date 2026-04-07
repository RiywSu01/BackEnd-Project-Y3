import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, UploadedFile} from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from '../prisma/prisma.service';
import { FilterRoomSearchDto } from './dto/filter-room-search.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  // FR-8: Create room 
  async Create(createRoomDto: CreateRoomDto) {
      // check if the required fields are provided or not
      if(!createRoomDto.name || !createRoomDto.capacity || !createRoomDto.price_per_night || !createRoomDto.start_date || !createRoomDto.end_date){
        throw new BadRequestException('Please make sure you have entered and check the correct format type of the name, capacity, price_per_night correctly, start date and end date and try again.');
      }
      const result = await this.prisma.rooms.create({ data: createRoomDto });
      if(!result){
        throw new InternalServerErrorException('An error occurred while creating the room.');
      }
      return { message: 'New Room has been created successfully.', data: result };
  }

  // FR-9: Edit room 
  async EditRoom(id: number, updateRoomDto: UpdateRoomDto) {
      // check if the required fields are provided or not
      if(!id || !updateRoomDto){
      throw new BadRequestException('Please make sure you have entered the correct room ID and update details and in correct format and try again.');
      }
      const room = await this.prisma.rooms.findUnique({ where: { id } });
      if (!room) {
        throw new NotFoundException(`Room id:${id} not found.`);
      }
      const result = await this.prisma.rooms.update({
        where: { id },
        data: { ...updateRoomDto, updated_at: new Date() },
      });
      if (!result) {
        throw new InternalServerErrorException(`An error occurred while updating room id:${id}.`);
      }
      return { message: `Room id:${id} has been updated successfully.`, data: result };
  }

  // FR-10: Delete room
  async DeleteRoom(id: number) {
    try{
      // check if the required fields are provided or not
      if(!id){
        throw new BadRequestException('Please make sure you have entered the correct room ID and try again.');
      }
      const room = await this.prisma.rooms.findUnique({ where: { id } });
      if (!room) {
        throw new NotFoundException(`Room id:${id} not found.`);
      }
      await this.prisma.rooms.delete({ where: { id } });
      return { message: `Room id:${id} has been deleted successfully.` };
    }catch(error){
      throw new InternalServerErrorException(`An error occurred while deleting room id:${id}.`);
    }
  }

  // FR-12: List all rooms
  async FindAllRooms() {
      const allRooms = await this.prisma.rooms.findMany();
      // check if there is any room in the system or not
      if (!allRooms) {
        throw new NotFoundException('No rooms found in the system.');
      }
      return { message: 'All rooms have been retrieved successfully.', data: allRooms };
  }

  // FR-13 + FR-16: Get one room (includes image_url)
  async FindARoom(id: number) {
      // check if the required fields are provided or not
      if(!id){
        throw new BadRequestException('Please make sure you have entered the correct room ID and try again.');
      }
      const room = await this.prisma.rooms.findUnique({ where: { id } });
      // check if the room ID exist or not
      if (!room) {
        throw new NotFoundException(`Room id:${id} not found.`);
      }
      return { message: `Room id:${id} has been retrieved successfully.`, data: room };
  }

  // FR-10: Disable room
  async Disable(id: number) {
      // check if the required fields are provided or not
      if(!id){
        throw new BadRequestException('Please make sure you have entered the correct room ID and try again.');
      }
      const room = await this.prisma.rooms.findUnique({ where: { id } });
      // check if the room ID exist or not
      if (!room) {
        throw new NotFoundException(`Room id:${id} not found.`);
      }
      const result = await this.prisma.rooms.update({ where: { id }, data: { is_active: false } });
      if(!result){
        throw new InternalServerErrorException(`An error occurred while disabling room id:${id}.`);
      }
      return { message: `Room id:${id} has been deactivated.`, data: result };
  }

  // FR-10: Enable room
  async Enable(id: number) {
      // check if the required fields are provided or not
      if(!id){
        throw new BadRequestException('Please make sure you have entered the correct room ID and try again.');
      }
      const room = await this.prisma.rooms.findUnique({ where: { id } });
      // check if the room ID exist or not
      if (!room) {
        throw new NotFoundException(`Room id:${id} not found.`);
      }
      const result = await this.prisma.rooms.update({ where: { id }, data: { is_active: true } });
      if(!result){
        throw new InternalServerErrorException(`An error occurred while enabling room id:${id}.`);
      }
      return { message: `Room id:${id} has been activated.`, data: result };
  }

  // FR-14 + FR-15: Upload and store room image
  async UploadImage(id: number, file: Express.Multer.File) {
    try{
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
    }catch(error){
      throw new InternalServerErrorException(`An error occurred while uploading image for room id:${id}.`);
    }
  }
  
  // FR-27+28+29: The system must allow users to search with query such as date range, date range + active status, capacity.
  async SearchRooms(filterRoomSearchDto: FilterRoomSearchDto) {
    //FR-27: search by date range
    if(filterRoomSearchDto.checkInDate != undefined && filterRoomSearchDto.checkOutDate != undefined && filterRoomSearchDto.is_active == undefined){
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
        }});
        // check if there is any room available for the selected date range or not
      if(!availableRooms || availableRooms.length === 0){
        throw new NotFoundException('No rooms available for the selected date range.');
      }
      return { message: `All rooms available for the selected date range: ${checkInDate} To ${checkOutDate} have been retrieved successfully.`, data: availableRooms };
    }

    //FR-29: search by date range and is_active status
     else if(filterRoomSearchDto.checkInDate != undefined && filterRoomSearchDto.checkOutDate != undefined && filterRoomSearchDto.is_active != undefined){
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
        }});
        // check if there is any room available for the selected date range or not
      if(!availableRooms || availableRooms.length === 0){
        throw new NotFoundException('No rooms available for the selected date range.');
      }
      return { message: `All rooms on active status available for the selected date range: ${checkInDate} To ${checkOutDate} have been retrieved successfully.`, data: availableRooms };
    }

    //FR-28: filter by capacity
    else if(filterRoomSearchDto.capacity != undefined){
      const availableRooms = await this.prisma.rooms.findMany({
        where: {
          capacity: { gte: filterRoomSearchDto.capacity },
        }});
        // check if there is any room available for the selected capacity or not
      if(!availableRooms || availableRooms.length === 0){
        throw new NotFoundException('No rooms available for the selected capacity.');
      }
      return { message: `All rooms available for the selected capacity: ${filterRoomSearchDto.capacity} have been retrieved successfully.`, data: availableRooms };
    }
  }

}

