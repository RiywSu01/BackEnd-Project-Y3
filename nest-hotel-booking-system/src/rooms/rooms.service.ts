import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, UploadedFile} from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  // FR-8: Create room 
  async Create(createRoomDto: CreateRoomDto) {
    try{
      // check if the required fields are provided or not
      if(!createRoomDto.name || !createRoomDto.capacity || !createRoomDto.price_per_night || !createRoomDto.start_date || !createRoomDto.end_date){
        throw new BadRequestException('Please make sure you have entered and check the correct format type of the name, capacity, price_per_night correctly, start date and end date and try again.');
      }
      const result = await this.prisma.rooms.create({ data: createRoomDto });
      return { message: 'New Room has been created successfully.', data: result };
    }
    catch(error){
      throw new InternalServerErrorException('An error occurred while creating the room');
    }
  }

  // FR-9: Edit room 
  async EditRoom(id: number, updateRoomDto: UpdateRoomDto) {
    try {
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
      return { message: `Room id:${id} has been updated successfully.`, data: result };
    } catch (error) {
      throw new InternalServerErrorException(`An error occurred while updating room id:${id}.`);
    }
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
    try{
      const allRooms = await this.prisma.rooms.findMany();
      // check if there is any room in the system or not
      if (!allRooms) {
        throw new NotFoundException('No rooms found in the system.');
      }
      return { message: 'All rooms have been retrieved successfully.', data: allRooms };
    }catch(error){
      throw new InternalServerErrorException('An error occurred while retrieving rooms.');
    }
  }

  // FR-13 + FR-16: Get one room (includes image_url)
  async FindARoom(id: number) {
    try{
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
    }catch(error){
      throw new InternalServerErrorException('An error occurred while retrieving the room.');
    }
  }

  // FR-10: Disable room
  async Disable(id: number) {
    try{
      // check if the required fields are provided or not
      if(!id){
        throw new BadRequestException('Please make sure you have entered the correct room ID and try again.');
      }
      const room = await this.prisma.rooms.findUnique({ where: { id } });
      // check if the room ID exist or not
      if (!room) {
        throw new NotFoundException(`Room id:${id} not found.`);
      }
      await this.prisma.rooms.update({ where: { id }, data: { is_active: false } });
      return { message: `Room id:${id} has been deactivated.` };
    }catch(error){
      throw new InternalServerErrorException(`An error occurred while disabling room id:${id}.`);
    }
  }

  // FR-10: Enable room
  async Enable(id: number) {
    try{
      // check if the required fields are provided or not
      if(!id){
        throw new BadRequestException('Please make sure you have entered the correct room ID and try again.');
      }
      const room = await this.prisma.rooms.findUnique({ where: { id } });
      // check if the room ID exist or not
      if (!room) {
        throw new NotFoundException(`Room id:${id} not found.`);
      }
      await this.prisma.rooms.update({ where: { id }, data: { is_active: true } });
      return { message: `Room id:${id} has been activated.` };
    }catch(error){
      throw new InternalServerErrorException(`An error occurred while enabling room id:${id}.`);
    }
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

}