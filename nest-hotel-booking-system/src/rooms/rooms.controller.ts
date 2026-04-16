import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { users_roles } from '@prisma/client';
import { FilterRoomSearchDto } from './dto/filter-room-search.dto';
import { UpdateRoomImageDto } from './dto/update-room-image.dto';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) { }

  // FR-8: Admin create room
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new room (Admin only)' })
  @ApiResponse({ status: 201, description: 'Room created successfully', schema: { example: { message: 'New Room has been created successfully.', data: { id: 1, name: 'Deluxe Room', capacity: 2, price_per_night: 1500, start_date: '2026-04-01T00:00:00.000Z', end_date: '2026-05-01T00:00:00.000Z', image_url: null, is_active: true } } } })
  @ApiResponse({ status: 400, description: 'Validation failed', schema: { example: { statusCode: 400, message: 'Please make sure you have entered and check the correct format type...', error: 'Bad Request' } } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { example: { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_roles.ADMIN)
  @Post()
  Create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.Create(createRoomDto);
  }

  // FR-9: Admin edit room
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Edit an existing room (Admin only)' })
  @ApiParam({ name: 'id', description: 'Room ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Room updated successfully', schema: { example: { message: 'Room id:1 has been updated successfully.', data: { id: 1, name: 'Super Deluxe', capacity: 2, price_per_night: 2000, start_date: '2026-04-01T00:00:00.000Z', end_date: '2026-05-01T00:00:00.000Z', image_url: null, is_active: true } } } })
  @ApiResponse({ status: 400, description: 'Validation failed', schema: { example: { statusCode: 400, message: 'Please make sure you have entered the correct room ID and update details...', error: 'Bad Request' } } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { example: { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' } } })
  @ApiResponse({ status: 404, description: 'Room not found', schema: { example: { statusCode: 404, message: 'Room id:1 not found.', error: 'Not Found' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_roles.ADMIN)
  @Patch(':id/edit')
  EditRoom(@Param('id', ParseIntPipe) id: number, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomsService.EditRoom(id, updateRoomDto);
  }

  // FR-10: Admin delete/deactivate room
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a room (Admin only)' })
  @ApiParam({ name: 'id', description: 'Room ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Room deleted successfully', schema: { example: { message: 'Room id:1 has been deleted successfully.' } } })
  @ApiResponse({ status: 400, description: 'Bad Request', schema: { example: { statusCode: 400, message: 'Please make sure you have entered the correct room ID and try again.', error: 'Bad Request' } } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { example: { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' } } })
  @ApiResponse({ status: 404, description: 'Room not found', schema: { example: { statusCode: 404, message: 'Room id:1 not found.', error: 'Not Found' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_roles.ADMIN)
  @Delete(':id/delete')
  DeleteRoom(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.DeleteRoom(id);
  }

  // FR-10: Admin disable room
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Disable a room (Admin only)' })
  @ApiParam({ name: 'id', description: 'Room ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Room disabled successfully', schema: { example: { message: 'Room id:1 has been deactivated.', data: { id: 1, is_active: false } } } })
  @ApiResponse({ status: 400, description: 'Bad Request', schema: { example: { statusCode: 400, message: 'Please make sure you have entered the correct room ID and try again.', error: 'Bad Request' } } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { example: { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' } } })
  @ApiResponse({ status: 404, description: 'Room not found', schema: { example: { statusCode: 404, message: 'Room id:1 not found.', error: 'Not Found' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_roles.ADMIN)
  @Patch(':id/disable')
  Disable(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.Disable(id);
  }

  // FR-10: Admin enable room
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Enable a room (Admin only)' })
  @ApiParam({ name: 'id', description: 'Room ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Room enabled successfully', schema: { example: { message: 'Room id:1 has been activated.', data: { id: 1, is_active: true } } } })
  @ApiResponse({ status: 400, description: 'Bad Request', schema: { example: { statusCode: 400, message: 'Please make sure you have entered the correct room ID and try again.', error: 'Bad Request' } } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { example: { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' } } })
  @ApiResponse({ status: 404, description: 'Room not found', schema: { example: { statusCode: 404, message: 'Room id:1 not found.', error: 'Not Found' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_roles.ADMIN)
  @Patch(':id/enable')
  Enable(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.Enable(id);
  }

  // FR-14: Admin update room image URL
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update the image URL for a room (Admin only)' })
  @ApiParam({ name: 'id', description: 'Room ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Room image URL updated successfully', schema: { example: { message: 'Image URL updated for room id:1.', data: { id: 1, image_url: 'https://example.com/image.jpg' } } } })
  @ApiResponse({ status: 400, description: 'Validation failed / bad request', schema: { example: { statusCode: 400, message: 'Image URL is required.', error: 'Bad Request' } } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { example: { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' } } })
  @ApiResponse({ status: 404, description: 'Room not found', schema: { example: { statusCode: 404, message: 'Room id:1 not found.', error: 'Not Found' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_roles.ADMIN)
  @Post(':id/upload-image')
  UpdateRoomImage(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoomImageDto: UpdateRoomImageDto,
  ) {
    return this.roomsService.UpdateRoomImage(id, updateRoomImageDto.image_url);
  }

  // FR-12: List all rooms (public) — cached 60s
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60000)
  @ApiOperation({ summary: 'List all rooms' })
  @ApiResponse({ status: 200, description: 'Retrieved list of all rooms', schema: { example: { message: 'All rooms have been retrieved successfully.', data: [{ id: 1, name: 'Deluxe' }] } } })
  @ApiResponse({ status: 404, description: 'No rooms found', schema: { example: { statusCode: 404, message: 'No rooms found in the system.', error: 'Not Found' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Get()
  FindAllRooms() {
    return this.roomsService.FindAllRooms();
  }

  // FR-27+28+29: The system must allow users to search with date range, date range + active status, capacity (User) - cached 30s
  // This route need to be before the @Get(':id') route, otherwise it will treat 'search' as an ID and cause an error. So I put it here.
  //Example of endpoints
  // /rooms/search?checkInDate=2026-04-01T14:00:00Z&checkOutDate=2026-05-05T14:00:00Z
  // /rooms/search?checkInDate=2026-04-01T14:00:00Z&checkOutDate=2026-05-05T14:00:00Z&is_active=true
  // /rooms/search?capacity=2
  @ApiBearerAuth('access-token')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000)
  @ApiOperation({ summary: 'Search rooms with filters' })
  @ApiResponse({ status: 200, description: 'Retrieved matching rooms', schema: { example: { message: 'All rooms available for the selected capacity: 2 have been retrieved successfully.', data: [{ id: 1, name: 'Deluxe' }] } } })
  @ApiResponse({ status: 400, description: 'Validation failed', schema: { example: { statusCode: 400, message: 'Check-out date must be after check-in date.', error: 'Bad Request' } } })
  @ApiResponse({ status: 403, description: 'Forbidden', schema: { example: { statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' } } })
  @ApiResponse({ status: 404, description: 'No rooms available matching criteria', schema: { example: { statusCode: 404, message: 'No rooms available for the selected capacity.', error: 'Not Found' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_roles.USER)
  @Get('search')
  SearchRooms(@Query() filterRoomSearchDto: FilterRoomSearchDto) {
    return this.roomsService.SearchRooms(filterRoomSearchDto);
  }

  // FR-13: Get room details (public) — cached 60s
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60000)
  @ApiOperation({ summary: 'Get room details by ID' })
  @ApiParam({ name: 'id', description: 'Room ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Room details retrieved', schema: { example: { message: 'Room id:1 has been retrieved successfully.', data: { id: 1, name: 'Deluxe' } } } })
  @ApiResponse({ status: 400, description: 'Bad Request', schema: { example: { statusCode: 400, message: 'Please make sure you have entered the correct room ID and try again.', error: 'Bad Request' } } })
  @ApiResponse({ status: 404, description: 'Room not found', schema: { example: { statusCode: 404, message: 'Room id:1 not found.', error: 'Not Found' } } })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Get(':id')
  FindARoom(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.FindARoom(id);
  }
}