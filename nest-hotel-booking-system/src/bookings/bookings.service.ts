import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PrismaService } from '../prisma/prisma.service';
import { bookings_bookings_status } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}  

  //For Admin to retrieved all booking in system
  async FindAllBooking(){
    try{
      const result = this.prisma.bookings.findMany();
      if(!result){
        throw new NotFoundException('Not found any booking in the system.');
      }
    }catch(error){
      throw new InternalServerErrorException('something went wrong went retrieved all booking in system.');
    }
  }

  //User Create bookings
  async CreateBooking(username: string, createBookingDto: CreateBookingDto) {
    try{
      //Check if that room is already booked or not
      const Room_id = await this.prisma.rooms.findUnique({where:{id: createBookingDto.Room_ID}});
      if(Room_id){
        throw new ConflictException(`Room id:${createBookingDto.Room_ID} has already been booked, please find another rooms.`);
      }
      // check if the check_in date is greater or equal check_out date or not
      if (new Date(createBookingDto.check_in) >= new Date(createBookingDto.check_out)) {
        throw new BadRequestException('Check-out date must be after check-in date.');
      }

      const newBooking = {
        username: username,
        Room_ID: createBookingDto.Room_ID,
        check_in: createBookingDto.check_in,
        check_out: createBookingDto.check_out
      }
      const result = await this.prisma.bookings.create({data: newBooking});
      return {message:"Your booking has been created successfully.", data:result};

    }catch(error){
      throw new BadRequestException('Please provided the information.');
    }
  }

  //For User to retrieved all of their own booking
  async FindAllMyBooking(username: string) {
    try{
      const result = await this.prisma.bookings.findMany({
        where: { username: username}, 
        include:{rooms: true}  // This will show all the room details
      });
      return {message:"All of your booking have been retrieved successfully.", data:result};
    }catch(error){
      throw new NotFoundException("Not found any booking that you created.");
    }
  }

  //For User to retrieved one of their own booking
  async FindOneBooking(id: number, username: string) {
    try{
      const booking = this.prisma.bookings.findUnique({where:{id: id}});
      if(!booking){
        throw new NotFoundException(`booking ID:${id} not found.`);
      }
      const result = await this.prisma.bookings.findFirst({
        where:{
          username: username,
          Room_ID: id
        },
        include:{
          rooms: true
        }
      });
      return {message:`Your booking id:${id} has been retrieved successfully.`, data: result};
    }catch(error){
      throw new InternalServerErrorException(`Something went wrong while retrieved the booking ID:${id}.`);
    }
  }

  //For Admin to change the status of the selected booking by ID.
  async ChangeBookingStatus(id: number, status: bookings_bookings_status, updateBookingDto: UpdateBookingDto) {
    try{
      const result = this.prisma.bookings.update({ 
        where:{ id: id }, 
        data:{bookings_status: status}
      });
      return {message:`The booking ID:${id} status has been changed successfully.`, data: result}
    }catch(error){
      throw new InternalServerErrorException(`Something went wrong while changing status of booking ID:${id}.`);
    }
  }

  remove(id: number) {
    return `This action removes a #${id} booking`;
  }
}
