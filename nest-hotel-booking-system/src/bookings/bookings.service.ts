import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PrismaService } from '../prisma/prisma.service';
import { bookings_bookings_status } from '@prisma/client';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { Booking } from './entities/booking.entity';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}
  private readonly logger = new Logger(BookingsService.name);

  //For Admin to retrieved all booking in system
  async FindAllBooking(){
      const result = await this.prisma.bookings.findMany();
      // check if there is any booking in the system or not
      if(!result){
        throw new NotFoundException('Not found any booking in the system.');
      }
      return {message:"All booking in the system have been retrieved successfully.", data: result};
  }

  //User Create bookings
  async CreateBooking(username: string, createBookingDto: CreateBookingDto) {
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
      if(!result){ 
        throw new InternalServerErrorException('An error occurred while creating the booking.');
      }

      // Emit(trigger) the booking created event with the booking details, Emit the event and pass the booking details as payload to the event listeners that are listening to this event. The event listeners can then use this information to perform any necessary actions, such as sending a notification to the user or updating the availability of the room.
      this.eventEmitter.emit('booking.created', result);

      return {message:"Your booking has been created successfully.", data:result};
  }

  //For User to retrieved all of their own booking
  async FindAllMyBooking(username: string) {
      const result = await this.prisma.bookings.findMany({
        where: { username: username}
      });
      if(!result){
        throw new NotFoundException('You have not made any booking yet.');
      }
      return {message:"All of your booking have been retrieved successfully.", data:result};
  }

  //For User to retrieved one of their own booking
  async FindOneBooking(id: number, username: string) {
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
      if(!result){
        throw new NotFoundException(`You have not made any booking with booking ID:${id}.`);
      }
      return {message:`Your booking id:${id} has been retrieved successfully.`, data: result};
  }

  //For Admin to change the status of the selected booking by ID.
  async ChangeBookingStatus(id: number, status: bookings_bookings_status) {
      if(!id || !status){
        throw new BadRequestException('Please make sure you have entered the correct booking ID and status and try again.');
      }
      //To check booking_ID that user input is exist or not (use findUnique() before update() because findUnique() when cant find it the result, it will return "null". But update() didnt throw the null, it throw the P2025 error instead.)
      const BookingExist = await this.prisma.bookings.findUnique({where: {Booking_ID:id}});
      if (!BookingExist){
        throw new NotFoundException(`The booking ID: ${id} not found in the system.`);
      }
      const result = await this.prisma.bookings.update({ 
        where:{ Booking_ID: id }, 
        data:{bookings_status: status}
      });
      if(!result){
        throw new NotFoundException(`booking ID:${id} not found.`);
      }
      // If status  is cancelled, emit the booking cancelled event with the booking details.
      if( status == "Cancelled"){
        // Emit the event and pass the booking details as payload to the event listeners that are listening to this event. 
        this.eventEmitter.emit('booking.cancelled', result);
      }
      return {message:`The booking ID:${id} status has been changed successfully.`, data: result}
  }


  //FR-30: When a booking is created, the system must record this event so the frontend can inform the user.
  @OnEvent('booking.created')
  async CreateBookingEvent(payload: any) {
    // 1. Log the payload to ensure it has the data you expect
    this.logger.debug('Received payload in event:', payload);
    try{
      const checkInDate = new Date(payload.check_in);
      const checkOutDate = new Date(payload.check_out);
      const newMessage = `Success! Your Booking for Room ID:${payload.Room_ID} from ${checkInDate.toDateString()} to ${checkOutDate.toDateString()} has been created successfully.`;
      await this.prisma.notifications.create({
        data: {
          username: payload.username,
          message: newMessage,
          is_read: false, // Explicitly marking it as unread
        }
      });
      this.logger.log(`Notification created for ${payload.username}`);
    }catch(error){
      // 2. Log the REAL error so you can see what actually broke!
      this.logger.error('Error occurred while creating booking notification:', error);
    }
  }

  //FR-31: When a booking is cancelled, the system must record this event so the frontend can inform the user.
  @OnEvent('booking.cancelled')
  async CancelBookingEvent(payload: any) {
    // 1. Log the payload to ensure it has the data you expect
    this.logger.debug('Received payload in event:', payload);
    try{
      const newMessage = `Your Booking with booking ID:${payload.Booking_ID} has been cancelled successfully.`;
      await this.prisma.notifications.create({
        data: {
          username: payload.username,
          message: newMessage,
          is_read: false,
        }
      });
      this.logger.log(`Cancellation notification created for ${payload.username}`);
    }catch(error){
      this.logger.error('Error occurred while deleting booking notification:', error);    
    }
  }

}
