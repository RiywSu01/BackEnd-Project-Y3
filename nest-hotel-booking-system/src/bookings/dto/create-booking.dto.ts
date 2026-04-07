import { Type } from "class-transformer";
import { IsDateString, IsEmpty, IsInt, IsNotEmpty, IsString } from "class-validator";

export class CreateBookingDto {
    @IsInt({message: 'Room ID must be an integer.'})
    @IsNotEmpty({message: 'Room ID is required.'})
    @Type(() => Number) // This automatically converts "12" to 12 before validation
    Room_ID: number;

    @IsDateString(
        { strict: true }, // Optional: forces strict calendar validation
        { message: 'Check-in date must be a valid date string in ISO format (e.g., 2026-06-01T14:00:00Z).' }
    )
    @IsNotEmpty({message: 'Check-in date is required.'})
    check_in: Date;

    @IsDateString(
        { strict: true }, // Optional: forces strict calendar validation
        { message: 'Check-out date must be a valid date string in ISO format (e.g., 2026-06-01T14:00:00Z).' }
    )
    @IsNotEmpty({message: 'Check-out date is required.'})
    check_out: Date;
}
