import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class UpdateRoomImageDto {
  @ApiProperty({
    description: 'The URL of the room image',
    example: 'https://example.com/images/room101.jpg',
  })
  @IsString({ message: 'Image URL must be a string.' })
  @IsNotEmpty({ message: 'Image URL is required.' })
  // @IsUrl({}, { message: 'Image URL must be a valid URL format.' }) // Optional: uncomment if you strictly want full URLs
  image_url: string;
}
