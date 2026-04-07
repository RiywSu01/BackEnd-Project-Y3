import { Type } from "class-transformer";
import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, Min } from "class-validator";

export class FilterRoomSearchDto {
    @IsDateString(
            { strict: true }, // Optional: forces strict calendar validation
            { message: 'Check-in date must be a valid date string in ISO format (e.g., 2026-06-01T14:00:00Z).' }
        )
    @IsOptional()
    checkInDate?: Date;

    @IsDateString(
            { strict: true }, // Optional: forces strict calendar validation
            { message: 'Check-out date must be a valid date string in ISO format (e.g., 2026-06-01T14:00:00Z).' }
        )
    @IsOptional()
    checkOutDate?: Date;

    @IsBoolean({message: 'is_active must be a boolean value.'})
    @Type(() => Boolean) // This automatically converts "true" to true before validation
    @IsOptional()
    is_active?: boolean;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1, {message: 'Capacity must be at least 1.'})
    capacity?: number; // The '?' means it could be undefined


}