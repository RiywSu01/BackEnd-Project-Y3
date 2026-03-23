export class CreateRoomDto {
    id?: number;
    name: string;
    description?: string;
    capacity: number;
    price_per_night: number;
    image_url?: string;
    is_active?: boolean;
    created_at?: Date;
    updated_at?: Date;
}
