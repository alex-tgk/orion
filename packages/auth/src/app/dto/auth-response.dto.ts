export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export class LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserResponseDto;
}
