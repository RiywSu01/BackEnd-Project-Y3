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
  ) { }
  private readonly logger = new Logger(BookingsService.name);

  //Retrieved all booking in systems (Admin Only)
  async FindAllBooking() {
    this.logger.log('Fetching all bookings...');
    const result = await this.prisma.bookings.findMany();
    // check if there is any booking in the system or not
    if (!result) {
      this.logger.warn('No bookings found in the system');
      throw new NotFoundException('Not found any booking in the system.');
    }
    this.logger.log(`Admin retrieved all bookings (${result.length} found)`);
    return { message: "All booking in the system have been retrieved successfully.", data: result };
  }

  //Create Booking (User only)
  async CreateBooking(username: string, createBookingDto: CreateBookingDto) {
    this.logger.log(`Creating booking for user '${username}' on room id:${createBookingDto.Room_ID}...`);
    // check if the required fields are provided or not
    if (!createBookingDto.Room_ID || !createBookingDto.check_in || !createBookingDto.check_out) {
      this.logger.warn(`Booking creation failed for user '${username}': missing required fields`);
      throw new BadRequestException('Please make sure you have entered the Room_ID, check_in and check_out date correctly and try again.');
    }
    //check if the room exist or not
    const room = await this.prisma.rooms.findUnique({ where: { id: createBookingDto.Room_ID } });
    if (!room) {
      this.logger.warn(`Booking creation failed: room id:${createBookingDto.Room_ID} not found`);
      throw new NotFoundException(`Room id:${createBookingDto.Room_ID} not found.`);
    }
    //FR-20
    //Check if that room is already booked or not
    const existingBooking = await this.prisma.bookings.findFirst({ where: { Room_ID: createBookingDto.Room_ID } });
    if (existingBooking) {
      this.logger.warn(`Booking creation conflict: room id:${createBookingDto.Room_ID} already booked`);
      throw new ConflictException(`Room id:${createBookingDto.Room_ID} is already booked.`);
    }
    //FR-19
    // check if the check_in date is greater or equal check_out date or not
    if (new Date(createBookingDto.check_in) >= new Date(createBookingDto.check_out)) {
      this.logger.warn(`Booking creation failed for user '${username}': check-out before check-in`);
      throw new BadRequestException('Check-out date must be after check-in date.');
    }
    // check if the check_in and check_out date is within the room availability period or not
    if (new Date(createBookingDto.check_in) < room.start_date || new Date(createBookingDto.check_out) > room.end_date) {
      this.logger.warn(`Booking creation failed for user '${username}': dates outside room availability`);
      throw new BadRequestException('Sorry, the room is not available for the selected dates. Please choose different dates within the room availability period.');
    }
    //FR-18
    const newBooking = {
      username: username,
      Room_ID: createBookingDto.Room_ID,
      check_in: createBookingDto.check_in,
      check_out: createBookingDto.check_out
    }
    const result = await this.prisma.bookings.create({ data: newBooking });
    if (!result) {
      throw new InternalServerErrorException('An error occurred while creating the booking.');
    }

    // Emit(trigger) the booking created event with the booking details, Emit the event and pass the booking details as payload to the event listeners that are listening to this event. The event listeners can then use this information to perform any necessary actions, such as sending a notification to the user or updating the availability of the room.
    this.eventEmitter.emit('booking.created', result);

    this.logger.log(`Booking created: id:${result.Booking_ID} by user '${username}' for room id:${createBookingDto.Room_ID}`);
    return { message: "Your booking has been created successfully.", data: result };
  }

  //Retrieved all of own booking (User only)
  async FindAllMyBooking(username: string) {
    this.logger.log(`Fetching all bookings for user '${username}'...`);
    const result = await this.prisma.bookings.findMany({
      where: { username: username }
    });
    if (!result) {
      this.logger.warn(`No bookings found for user '${username}'`);
      throw new NotFoundException('You have not made any booking yet.');
    }
    this.logger.log(`Retrieved ${result.length} bookings for user '${username}'`);
    return { message: "All of your booking have been retrieved successfully.", data: result };
  }

  //Retrieved one of their own booking (User Only)
  async FindOneBooking(id: number, username: string) {
    this.logger.log(`Fetching booking id:${id} for user '${username}'...`);
    // check if the booking ID exist or not
    if (!id) {
      throw new BadRequestException('Please make sure you have entered the correct booking ID and try again.');
    }
    // check if the booking ID exist or not
    const booking = this.prisma.bookings.findUnique({ where: { Booking_ID: id } });
    if (!booking) {
      this.logger.warn(`Booking lookup failed: booking id:${id} not found`);
      throw new NotFoundException(`booking ID:${id} not found.`);
    }
    const result = await this.prisma.bookings.findFirst({
      where: {
        username: username,
        Room_ID: id
      }
    });
    if (!result) {
      this.logger.warn(`User '${username}' has no booking with id:${id}`);
      throw new NotFoundException(`You have not made any booking with booking ID:${id}.`);
    }
    this.logger.log(`Booking id:${id} retrieved for user '${username}'`);
    return { message: `Your booking id:${id} has been retrieved successfully.`, data: result };
  }

  //Change the status of the selected booking by ID. (Admin Only)
  async ChangeBookingStatus(id: number, status: bookings_bookings_status) {
    this.logger.log(`Changing booking id:${id} status to '${status}'...`);
    if (!id || !status) {
      this.logger.warn('Status change failed: missing booking ID or status');
      throw new BadRequestException('Please make sure you have entered the correct booking ID and status and try again.');
    }
    //To check booking_ID that user input is exist or not (use findUnique() before update() because findUnique() when cant find it the result, it will return "null". But update() didnt throw the null, it throw the P2025 error instead.)
    const BookingExist = await this.prisma.bookings.findUnique({ where: { Booking_ID: id } });
    if (!BookingExist) {
      this.logger.warn(`Status change failed: booking id:${id} not found`);
      throw new NotFoundException(`The booking ID: ${id} not found in the system.`);
    }
    const result = await this.prisma.bookings.update({
      where: { Booking_ID: id },
      data: { bookings_status: status }
    });
    if (!result) {
      throw new NotFoundException(`booking ID:${id} not found.`);
    }
    // If status  is cancelled, emit the booking cancelled event with the booking details.
    if (status == "Cancelled") {
      // Emit the event and pass the booking details as payload to the event listeners that are listening to this event. 
      this.eventEmitter.emit('booking.cancelled', result);
    }
    this.logger.log(`Booking id:${id} status changed to '${status}'`);
    return { message: `The booking ID:${id} status has been changed successfully.`, data: result }
  }

  //Create Booking notification
  //FR-30: When a booking is created, the system must record this event so the frontend can inform the user.
  @OnEvent('booking.created')
  async CreateBookingEvent(payload: any) {
    // 1. Log the payload to ensure it has the data you expect
    this.logger.debug('Received payload in event:', payload);
    try {
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
    } catch (error) {
      // 2. Log the REAL error so you can see what actually broke!
      this.logger.error('Error occurred while creating booking notification:', error);
    }
  }

  //Cancel Booking notification
  //FR-31: When a booking is cancelled, the system must record this event so the frontend can inform the user.
  @OnEvent('booking.cancelled')
  async CancelBookingEvent(payload: any) {
    // 1. Log the payload to ensure it has the data you expect
    this.logger.debug('Received payload in event:', payload);
    try {
      const newMessage = `Your Booking with booking ID:${payload.Booking_ID} has been cancelled successfully.`;
      await this.prisma.notifications.create({
        data: {
          username: payload.username,
          message: newMessage,
          is_read: false,
        }
      });
      this.logger.log(`Cancellation notification created for ${payload.username}`);
    } catch (error) {
      this.logger.error('Error occurred while deleting booking notification:', error);
    }
  }

}
