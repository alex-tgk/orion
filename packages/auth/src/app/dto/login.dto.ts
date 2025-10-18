import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password (minimum 8 characters)',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
