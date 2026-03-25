import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { GetUser } from '../auth/decorators/GetUserJWT-Payload';
import { bookings_bookings_status } from '@prisma/client';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  //List all booking in system endpoint (For Admin to retrieved all booking in system.)
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(users_roles.ADMIN)
  @Get('ListAllBooking')
  FindAllBooking() {
    return this.bookingsService.FindAllBooking();
  }

  //Change status booking endpoint (For Admin to change the status of the selected booking by ID.)
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(users_roles.USER)
  @Patch(':id/:status/Changestatus')
  ChangeBookingStatus(
    @Param('id') id: string,             
    @Param('status') status: bookings_bookings_status,    
    @Body() updateBookingDto: UpdateBookingDto
  ) {
    return this.bookingsService.ChangeBookingStatus(+id, status, updateBookingDto);
  }

  //Create booking endpoint (For User to retrieved create thier own booking.)
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(users_roles.USER)
  @Post('CreateRoom')
  CreateBooking(
    @GetUser('username') username: string,
    @Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.CreateBooking(username, createBookingDto);
  }

  //User's all booking endpoint (For User to retrieve all of their own booking.)
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(users_roles.USER)
  @Get('ListAllMyBooking')
  FindAllMyBooking(@GetUser('username') username: string) {
    return this.bookingsService.FindAllMyBooking(username);
  }

  //User's one booking endpoint (For User to see the details of one of their own bookings.)
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(users_roles.USER)
  @Get(':id/ListMyBooking')
  FindOneBooking(
    @Param('id') id: string,
    @GetUser('username') username: string){
    return this.bookingsService.FindOneBooking(+id, username);
  }

}
