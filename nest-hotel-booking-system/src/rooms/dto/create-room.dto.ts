export class CreateRoomDto {
    id?: number;
    name: string;
    description?: string;
    capacity: number;
    price_per_night: number;
    image_url?: string;
    is_active?: boolean;
    start_date: Date;
    end_date: Date;
    created_at?: Date;
    updated_at?: Date;
}
