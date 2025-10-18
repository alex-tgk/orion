import { Module } from '@nestjs/common';

// Controllers
import { ConfigController } from './controllers/config.controller';
import { SettingsController } from './controllers/settings.controller';

// Services
import { ConfigManagementService } from './services/config-management.service';
import { SettingsService } from './services/settings.service';
import { ConfigValidationService } from './services/config-validation.service';

/**
 * Configuration Management Module
 *
 * Provides functionality for managing system configuration and settings.
 */
@Module({
  controllers: [ConfigController, SettingsController],
  providers: [
    ConfigManagementService,
    SettingsService,
    ConfigValidationService,
  ],
  exports: [
    ConfigManagementService,
    SettingsService,
    ConfigValidationService,
  ],
})
export class ConfigurationModule {}