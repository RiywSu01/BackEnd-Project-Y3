import { Type } from "class-transformer";
import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateRoomDto {
    @IsInt({message: 'Room ID must be an integer.'})
    @IsOptional()
    @Type(() => Number) // This automatically converts "12" to 12 before validation
    id?: number;

    @IsString({message: 'Room name must be a string.'})
    @IsNotEmpty({message: 'Room name is required.'})
    name: string;

    @IsString({message: 'Room description must be a string.'})
    @IsOptional()
    description?: string;

    @IsInt({message: 'Room capacity must be an integer.'})
    @IsNotEmpty({message: 'Room capacity is required.'})
    @Type(() => Number) // This automatically converts "12" to 12 before validation
    @Min(1, {message: 'Capacity must be at least 1.'})
    capacity: number;

    @IsNumber({},{message: 'Price per night must be a number.'})
    @IsNotEmpty({message: 'Price per night is required.'})
    @Type(() => Number) // This automatically converts "12" to 12 before validation
    price_per_night: number;

    @IsString({message: 'Image URL must be a string.'})
    @IsOptional()
    image_url?: string;

    @IsBoolean({message: 'is_active must be a boolean value.'})
    @IsOptional()
    @Type(() => Boolean) // This automatically converts "true" to true before validation
    is_active?: boolean;
    
    @IsDateString(
        { strict: true }, // Optional: forces strict calendar validation
        { message: 'start_date must be a valid date string in ISO format (e.g., 2026-06-01T14:00:00Z).' }
    )
    @IsNotEmpty({message: 'start_date is required.'})
    start_date: Date;

    @IsDateString(
        { strict: true }, // Optional: forces strict calendar validation
        { message: 'end_date must be a valid date string in ISO format (e.g., 2026-06-01T14:00:00Z).' }
    )
    @IsNotEmpty({message: 'end_date is required.'})
    end_date: Date;

    @IsDateString(
        { strict: true }, // Optional: forces strict calendar validation
        { message: 'created_at must be a valid date string in ISO format (e.g., 2026-06-01T14:00:00Z).' }
    )
    @IsOptional()
    created_at?: Date;

    @IsDateString(
        { strict: true }, // Optional: forces strict calendar validation
        { message: 'updated_at must be a valid date string in ISO format (e.g., 2026-06-01T14:00:00Z).' }
    )
    @IsOptional()
    updated_at?: Date;
}
