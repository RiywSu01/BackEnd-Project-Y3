import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { GetUser } from '../auth/decorators/GetUserJWT-Payload';
import { bookings_bookings_status, users_roles } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  //List all booking in system endpoint (For Admin to retrieved all booking in system.)
  @Roles(users_roles.ADMIN)
  @Get('ListAllBooking')
  FindAllBooking() {
    return this.bookingsService.FindAllBooking();
  }

  //Change status booking endpoint (For Admin to change the status of the selected booking by ID.)
  @Roles(users_roles.ADMIN)
  @Patch(':id/:status/ChangeStatus')
  ChangeBookingStatus(
    @Param('id') id: string,             
    @Param('status') status: bookings_bookings_status
  ) {
    return this.bookingsService.ChangeBookingStatus(+id, status);
  }

  //Create booking endpoint (For User to retrieved create their own booking.)
  @Roles(users_roles.USER)
  @Post('CreateRoom')
  CreateBooking(
    @GetUser('username') username: string,
    @Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.CreateBooking(username, createBookingDto);
  }

  //User's all booking endpoint (For User to retrieve all of their own booking.)
  @Roles(users_roles.USER)
  @Get('ListAllMyBooking')
  FindAllMyBooking(@GetUser('username') username: string) {
    return this.bookingsService.FindAllMyBooking(username);
  }

  //User find one booking endpoint (For User to see the details of one of their own bookings.)
  @Roles(users_roles.USER)
  @Get(':id/ListMyBooking')
  FindOneBooking(
    @Param('id') id: string,
    @GetUser('username') username: string){
    return this.bookingsService.FindOneBooking(+id, username);
  }

}
