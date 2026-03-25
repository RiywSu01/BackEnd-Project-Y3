import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [PrismaModule, AuthModule, MulterModule.register({ dest: './uploads/rooms' }),],
  controllers: [RoomsController],
  providers: [RoomsService],
})
export class RoomsModule {}