import { ApiProperty } from '@nestjs/swagger';

export class AvatarUploadResponseDto {
  @ApiProperty({ description: 'Avatar URL', example: 'https://storage.orion.com/avatars/user123.jpg' })
  avatarUrl: string;
}
