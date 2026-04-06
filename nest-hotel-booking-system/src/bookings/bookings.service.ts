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
      const result = await this.prisma.bookings.findMany();
      // check if there is any booking in the system or not
      if(!result){
        throw new NotFoundException('Not found any booking in the system.');
      }
      return {message:"All booking in the system have been retrieved successfully.", data: result};
    }catch(error){
      throw new InternalServerErrorException('something went wrong went retrieved all booking in system.');
    }
  }

  //User Create bookings
  async CreateBooking(username: string, createBookingDto: CreateBookingDto) {
    try{
      // check if the required fields are provided or not
      if(!createBookingDto.Room_ID || !createBookingDto.check_in || !createBookingDto.check_out){
        throw new BadRequestException('Please make sure you have entered the Room_ID, check_in and check_out date correctly and try again.');
      }
      //check if the room exist or not
      const room = await this.prisma.rooms.findUnique({where:{id: createBookingDto.Room_ID}});
      if(!room){
        throw new NotFoundException(`Room id:${createBookingDto.Room_ID} not found.`);
      }
      //Check if that room is already booked or not
      const existingBooking = await this.prisma.bookings.findFirst({where:{Room_ID: createBookingDto.Room_ID}});
      if(existingBooking){
        throw new ConflictException(`Room id:${createBookingDto.Room_ID} is already booked.`);
      }
      // check if the check_in date is greater or equal check_out date or not
      if (new Date(createBookingDto.check_in) >= new Date(createBookingDto.check_out)) {
        throw new BadRequestException('Check-out date must be after check-in date.');
      }
      // check if the check_in and check_out date is within the room availability period or not
      if ( new Date(createBookingDto.check_in) < room.start_date || new Date(createBookingDto.check_out) > room.end_date) {
        throw new BadRequestException('Sorry, the room is not available for the selected dates. Please choose different dates within the room availability period.');
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
      throw new InternalServerErrorException('Something went wrong while creating your booking.');
    }
  }

  //For User to retrieved all of their own booking
  async FindAllMyBooking(username: string) {
    try{
      const result = await this.prisma.bookings.findMany({
        where: { username: username}
      });
      if(!result){
        throw new NotFoundException('You have not made any booking yet.');
      }
      return {message:"All of your booking have been retrieved successfully.", data:result};
    }catch(error){
      throw new InternalServerErrorException('Something went wrong while retrieving your bookings.');
    }
  }

  //For User to retrieved one of their own booking
  async FindOneBooking(id: number, username: string) {
    try{
      // check if the booking ID exist or not
      if(!id){
        throw new BadRequestException('Please make sure you have entered the correct booking ID and try again.');
      }
      // check if the booking ID exist or not
      const booking = this.prisma.bookings.findUnique({where:{Booking_ID: id}});
      if(!booking){
        throw new NotFoundException(`booking ID:${id} not found.`);
      }
      const result = await this.prisma.bookings.findFirst({
        where:{
          username: username,
          Room_ID: id
        }
      });
      return {message:`Your booking id:${id} has been retrieved successfully.`, data: result};
    }catch(error){
      throw new InternalServerErrorException(`Something went wrong while retrieved the booking ID:${id}.`);
    }
  }

  //For Admin to change the status of the selected booking by ID.
  async ChangeBookingStatus(id: number, status: bookings_bookings_status) {
    try{
      if(!id || !status){
        throw new BadRequestException('Please make sure you have entered the correct booking ID and status and try again.');
      }
      const result = await this.prisma.bookings.update({ 
        where:{ Booking_ID: id }, 
        data:{bookings_status: status}
      });
      return {message:`The booking ID:${id} status has been changed successfully.`, data: result}
    }catch(error){
      throw new InternalServerErrorException(`Something went wrong while changing status of booking ID:${id}.`);
    }
  }

}
