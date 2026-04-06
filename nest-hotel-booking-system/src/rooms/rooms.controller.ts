import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, UploadedFile, UseInterceptors,} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { users_roles } from '@prisma/client';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // FR-8: Admin create room
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_roles.ADMIN)
  @Post()
  Create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.Create(createRoomDto);
  }

  // FR-9: Admin edit room
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_roles.ADMIN)
  @Patch(':id/edit')
  EditRoom(@Param('id', ParseIntPipe) id: number, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomsService.EditRoom(id, updateRoomDto);
  }

  // FR-10: Admin delete/deactivate room
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_roles.ADMIN)
  @Delete(':id/delete')
  DeleteRoom(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.DeleteRoom(id);
  }

  // FR-10: Admin disable room
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_roles.ADMIN)
  @Patch(':id/disable')
  Disable(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.Disable(id);
  }

  // FR-10: Admin enable room
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_roles.ADMIN)
  @Patch(':id/enable')
  Enable(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.Enable(id);
  }

  // FR-14: Admin upload room image
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(users_roles.ADMIN)
  @Post(':id/upload-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/rooms',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `room-${req.params.id}-${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|webp)$/i;
        cb(null, allowed.test(file.originalname));
      },
    }),
  )
  UploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.roomsService.UploadImage(id, file);
  }

  // FR-12: List all rooms (public)
  @Get()
  FindAllRooms() {
    return this.roomsService.FindAllRooms();
  }

  // FR-13: Get room details (public)
  @Get(':id')
  FindARoom(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.FindARoom(id);
  }
}