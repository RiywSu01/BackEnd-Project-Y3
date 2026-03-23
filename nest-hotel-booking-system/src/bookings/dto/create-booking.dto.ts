import { bookings_bookings_status } from '@prisma/client';
export class CreateBookingDto {
    Room_ID: number;
    check_in: string;
    check_out: string;
    booking_status: bookings_bookings_status;
}
