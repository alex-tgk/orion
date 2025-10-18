import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class NotificationPreferencesDto {
  @ApiProperty({ description: 'Email notifications enabled', example: true })
  @IsBoolean()
  email: boolean;

  @ApiProperty({ description: 'SMS notifications enabled', example: false })
  @IsBoolean()
  sms: boolean;

  @ApiProperty({ description: 'Push notifications enabled', example: true })
  @IsBoolean()
  push: boolean;
}

export enum ProfileVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  FRIENDS = 'friends',
}

class PrivacyPreferencesDto {
  @ApiProperty({ description: 'Profile visibility', enum: ProfileVisibility, example: 'public' })
  @IsEnum(ProfileVisibility)
  profileVisibility: ProfileVisibility;

  @ApiProperty({ description: 'Show email on profile', example: false })
  @IsBoolean()
  showEmail: boolean;

  @ApiProperty({ description: 'Show location on profile', example: true })
  @IsBoolean()
  showLocation: boolean;
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

class DisplayPreferencesDto {
  @ApiProperty({ description: 'UI theme', enum: Theme, example: 'dark' })
  @IsEnum(Theme)
  theme: Theme;

  @ApiProperty({ description: 'Language code (ISO 639-1)', example: 'en' })
  @IsString()
  language: string;
}

export class UserPreferencesDto {
  @ApiProperty({ description: 'Notification preferences', type: NotificationPreferencesDto })
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notifications: NotificationPreferencesDto;

  @ApiProperty({ description: 'Privacy preferences', type: PrivacyPreferencesDto })
  @ValidateNested()
  @Type(() => PrivacyPreferencesDto)
  privacy: PrivacyPreferencesDto;

  @ApiProperty({ description: 'Display preferences', type: DisplayPreferencesDto })
  @ValidateNested()
  @Type(() => DisplayPreferencesDto)
  display: DisplayPreferencesDto;
}

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({ description: 'Notification preferences', type: NotificationPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notifications?: Partial<NotificationPreferencesDto>;

  @ApiPropertyOptional({ description: 'Privacy preferences', type: PrivacyPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PrivacyPreferencesDto)
  privacy?: Partial<PrivacyPreferencesDto>;

  @ApiPropertyOptional({ description: 'Display preferences', type: DisplayPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DisplayPreferencesDto)
  display?: Partial<DisplayPreferencesDto>;
}
