import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { PreferencesService } from '../services/preferences.service';

/**
 * Update Preferences DTO
 */
class UpdatePreferencesDto {
  email?: {
    enabled?: boolean;
    types?: Record<string, boolean>;
  };
  sms?: {
    enabled?: boolean;
    types?: Record<string, boolean>;
  };
  push?: {
    enabled?: boolean;
    types?: Record<string, boolean>;
  };
}

/**
 * Preferences Controller
 *
 * Manages user notification preferences.
 */
@Controller('api/v1/preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  /**
   * Get user preferences
   */
  @Get(':userId')
  async getPreferences(@Param('userId') userId: string) {
    return this.preferencesService.getPreferences(userId);
  }

  /**
   * Update user preferences
   */
  @Patch(':userId')
  async updatePreferences(
    @Param('userId') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.preferencesService.updatePreferences(userId, dto);
  }

  /**
   * Reset preferences to defaults
   */
  @Patch(':userId/reset')
  async resetPreferences(@Param('userId') userId: string) {
    return this.preferencesService.resetToDefaults(userId);
  }
}
