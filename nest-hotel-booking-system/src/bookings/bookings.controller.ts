import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { GetUser } from '../auth/decorators/GetUserJWT-Payload';
import { bookings_bookings_status, users_roles } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Bookings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) { }

  //FR-25: List all booking in system endpoint (For Admin to retrieved all booking in system.)
  @ApiOperation({ summary: 'List all bookings in the system (Admin only)' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully', schema: { example: { message: 'All booking in the system have been retrieved successfully.', data: [{ Booking_ID: 1, username: 'johndoe', Room_ID: 1, check_in: '2026-06-01T14:00:00Z', check_out: '2026-06-05T14:00:00Z', bookings_status: 'Pending' }] } } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { example: { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' } } })
  @ApiResponse({ status: 404, description: 'No bookings found', schema: { example: { statusCode: 404, message: 'Not found any booking in the system.', error: 'Not Found' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Roles(users_roles.ADMIN)
  @Get('ListAllBooking')
  FindAllBooking() {
    return this.bookingsService.FindAllBooking();
  }

  //FR-26: Change status booking endpoint (For Admin to change the status of the selected booking by ID.)
  @ApiOperation({ summary: 'Change booking status (Admin only)' })
  @ApiParam({ name: 'id', description: 'Booking ID', example: '1' })
  @ApiParam({ name: 'status', description: 'New Status', enum: bookings_bookings_status, example: 'Approved' })
  @ApiResponse({ status: 200, description: 'Booking status updated successfully', schema: { example: { message: 'The booking ID:1 status has been changed successfully.', data: { Booking_ID: 1, username: 'johndoe', Room_ID: 1, bookings_status: 'Approved' } } } })
  @ApiResponse({ status: 400, description: 'Bad Request', schema: { example: { statusCode: 400, message: 'Please make sure you have entered the correct booking ID and status and try again.', error: 'Bad Request' } } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { example: { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' } } })
  @ApiResponse({ status: 404, description: 'Booking not found', schema: { example: { statusCode: 404, message: 'The booking ID: 1 not found in the system.', error: 'Not Found' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Roles(users_roles.ADMIN)
  @Patch(':id/:status/ChangeStatus')
  ChangeBookingStatus(
    @Param('id') id: string,
    @Param('status') status: bookings_bookings_status
  ) {
    return this.bookingsService.ChangeBookingStatus(+id, status);
  }

  //FR-17: Create booking endpoint (For User to retrieved create their own booking.)
  @ApiOperation({ summary: 'Create a new booking (User only)' })
  @ApiResponse({ status: 201, description: 'Booking created successfully', schema: { example: { message: 'Your booking has been created successfully.', data: { Booking_ID: 1, username: 'johndoe', Room_ID: 1, check_in: '2026-06-01T14:00:00Z', check_out: '2026-06-05T14:00:00Z', bookings_status: 'Pending' } } } })
  @ApiResponse({ status: 400, description: 'Bad Request or Validation failed', schema: { example: { statusCode: 400, message: 'Check-out date must be after check-in date.', error: 'Bad Request' } } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { example: { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' } } })
  @ApiResponse({ status: 404, description: 'Room not found', schema: { example: { statusCode: 404, message: 'Room id:1 not found.', error: 'Not Found' } } })
  @ApiResponse({ status: 409, description: 'Conflict', schema: { example: { statusCode: 409, message: 'Room id:1 is already booked.', error: 'Conflict' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Roles(users_roles.USER)
  @Post('CreateRoom')
  CreateBooking(
    @GetUser('username') username: string,
    @Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.CreateBooking(username, createBookingDto);
  }

  //FR-23: User's all booking endpoint (For User to retrieve all of their own booking.)
  @ApiOperation({ summary: 'List all user bookings (User only)' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved', schema: { example: { message: 'All of your booking have been retrieved successfully.', data: [{ Booking_ID: 1, Room_ID: 1, bookings_status: 'Approved' }] } } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { example: { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' } } })
  @ApiResponse({ status: 404, description: 'No bookings found', schema: { example: { statusCode: 404, message: 'You have not made any booking yet.', error: 'Not Found' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Roles(users_roles.USER)
  @Get('ListAllMyBooking')
  FindAllMyBooking(@GetUser('username') username: string) {
    return this.bookingsService.FindAllMyBooking(username);
  }

  //FR-24: User find one booking endpoint (For User to see the details of one of their own bookings.)
  @ApiOperation({ summary: 'Get details of a specific booking of current user that login (User only)' })
  @ApiParam({ name: 'id', description: 'Booking ID', example: '1' })
  @ApiResponse({ status: 200, description: 'Booking details retrieved', schema: { example: { message: 'Your booking id:1 has been retrieved successfully.', data: { Booking_ID: 1, Room_ID: 1, bookings_status: 'Approved' } } } })
  @ApiResponse({ status: 400, description: 'Bad Request', schema: { example: { statusCode: 400, message: 'Please make sure you have entered the correct booking ID and try again.', error: 'Bad Request' } } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { example: { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' } } })
  @ApiResponse({ status: 404, description: 'Booking not found', schema: { example: { statusCode: 404, message: 'booking ID:1 not found.', error: 'Not Found' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Roles(users_roles.USER)
  @Get(':id/ListMyBooking')
  FindOneBooking(
    @Param('id') id: string,
    @GetUser('username') username: string) {
    return this.bookingsService.FindOneBooking(+id, username);
  }

}
