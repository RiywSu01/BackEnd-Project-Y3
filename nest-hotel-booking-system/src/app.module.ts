import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoomsModule } from './rooms/rooms.module';
import { BookingsModule } from './bookings/bookings.module';
import { SearchModule } from './search/search.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [RoomsModule, BookingsModule, SearchModule, NotificationsModule, HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
