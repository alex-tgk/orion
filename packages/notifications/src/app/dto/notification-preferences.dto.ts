import {
  IsBoolean,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ChannelPreferencesDto {
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  types?: Record<string, boolean>;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ type: ChannelPreferencesDto, required: false })
  @ValidateNested()
  @Type(() => ChannelPreferencesDto)
  @IsOptional()
  email?: ChannelPreferencesDto;

  @ApiProperty({ type: ChannelPreferencesDto, required: false })
  @ValidateNested()
  @Type(() => ChannelPreferencesDto)
  @IsOptional()
  sms?: ChannelPreferencesDto;

  @ApiProperty({ type: ChannelPreferencesDto, required: false })
  @ValidateNested()
  @Type(() => ChannelPreferencesDto)
  @IsOptional()
  push?: ChannelPreferencesDto;
}

export class NotificationPreferencesResponseDto {
  @ApiProperty()
  email!: {
    enabled: boolean;
    types: Record<string, boolean>;
  };

  @ApiProperty()
  sms!: {
    enabled: boolean;
    types: Record<string, boolean>;
  };

  @ApiProperty()
  push!: {
    enabled: boolean;
    types: Record<string, boolean>;
  };
}
