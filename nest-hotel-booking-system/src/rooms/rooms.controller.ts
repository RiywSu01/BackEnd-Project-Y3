import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
// import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/declarators/roles.declarator';
// import { users_roles } from '@prisma/client';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(users_roles.ADMIN)
  @Post()
  Create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.Create(createRoomDto);
  }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(users_roles.ADMIN)
  @Patch(':id/Edit')
  EditRoom(@Param('id') id: string) {
    return this.roomsService.EditRoom(+id);
  }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(users_roles.ADMIN)
  @Delete(':id/delete')
  DeleteRoom(@Param('id') id: string) {
    return this.roomsService.DeleteRoom(+id);
  }
  
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(users_roles.ADMIN, users_roles.USER)
  @Get()
  FindAllRooms() {
    return this.roomsService.FindAllRooms();
  }


  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(users_roles.ADMIN, users_roles.USER)
  @Get(':id')
  FindARoom(@Param('id') id: string) {
    return this.roomsService.FindARoom(+id);
  }


  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(users_roles.ADMIN)
  @Patch(':id/disable')
  Update(@Param('id') id: string) {
    return this.roomsService.Disable(+id);
  }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(users_roles.ADMIN)
  @Patch(':id/enable')
  Enable(@Param('id') id: string) {
    return this.roomsService.Enable(+id);
  }

}
