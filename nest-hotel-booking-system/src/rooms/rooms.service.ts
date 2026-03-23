import { Injectable, NotFoundException, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import {PrismaService} from '../prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}  

  //Create room
  async Create(createRoomDto: CreateRoomDto){
    try{
      const newRoom = {
        id: createRoomDto.id,
        name: createRoomDto.name,
        description: createRoomDto.description,
        capacity: createRoomDto.capacity,
        price_per_night: createRoomDto.price_per_night,
        image_url: createRoomDto.image_url ?? 'placeholder.png',
        is_active: createRoomDto.is_active ?? true,
        created_at: createRoomDto.created_at,
        updated_at: createRoomDto.updated_at,
      }    
      const result = await this.prisma.rooms.create({data:newRoom});
      return {message:"new room has been created successfully.", data:result};

    }catch(error){
      throw new BadRequestException('Please provided the information.');
    }
  }

  //Edited/Updated selected room by ID
  async EditRoom(id :number){
    try{
      const room = await this.prisma.rooms.findUnique( { where:{ id } } );
      if(!room){
        throw new NotFoundException(`Room id:${id} not found.`);
      }
      const result =  await this.prisma.rooms.update({
        where: { id },
        // Prisma will only update the fields that are actually inside this DTO
        data: UpdateRoomDto, 
      });
      return {message:`Room id:${id} has been updated successfully.`, data:result};

    }catch(error){
      throw new InternalServerErrorException(`Something went wrong while updating the room id${id} information.`);
    }
  }

  //Delete rooms by ID
  async DeleteRoom(id:number){
    try{
      const room = await this.prisma.rooms.findUnique({where:{id}});
      if(!room){
        throw new NotFoundException(`Room id:${id} not found`);
      }
      await this.prisma.rooms.delete({ where: { id: id } });
      return {message:`Room id:${id} has been deleted successfully.`};
    }catch(error){
      throw new InternalServerErrorException(`Something went wrong while deleting the room id:${id}.`);
    }
  }

  //Retreive all rooms
  async FindAllRooms() {
    try{
      const allrooms = await this.prisma.rooms.findMany();
      if(!allrooms){
        throw new NotFoundException('There is no rooms right now.');
      }
      return {message:'All rooms has been retrieved successfully.', data: allrooms};
    }catch(error){
      throw new InternalServerErrorException(`Something went wrong while retrieved all rooms.`);
    }
  }

  //retreive one room by ID
  async FindARoom(id: number) {
    try{
      const room = await this.prisma.rooms.findUnique({where:{ id }});
      if(!room){ 
        throw new NotFoundException(`Room id:${id} not found.`);
      }
      return {message:`Room id:${id} details has been retrieved successfully.`, data:room};
    }catch(error){
      throw new InternalServerErrorException(`Something went wrong while retrieved the room id:${id}.`);
    }
  }

  //update the room status to be FALSE
  async Disable(id: number) {
    try{
      await this.prisma.rooms.update({ where:{ id: id }, data:{is_active: false},});
      return {message:`Room id:${id} has been Deactive.`};
    }catch(error){
      throw new NotFoundException(`Room id:${id} not found.`);
    }
  }

  //update the room status to be TRUE
  async Enable(id: number){
    try{
      await this.prisma.rooms.update({ where:{ id: id }, data:{is_active: true},});
      return {message:`Room id:${id} has been active.`};
    }catch(error){
      throw new NotFoundException(`Room id:${id} not found.`);
    }
  }

  

}
