import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TemplateService } from '../services/template.service';
import { NotificationType } from '@prisma/notifications';

/**
 * Create Template DTO
 */
class CreateTemplateDto {
  name: string;
  type: NotificationType;
  subject?: string;
  body: string;
  variables?: string[];
}

/**
 * Update Template DTO
 */
class UpdateTemplateDto {
  subject?: string;
  body?: string;
  variables?: string[];
  isActive?: boolean;
}

/**
 * Templates Controller
 *
 * Manages notification templates for email, SMS, and push notifications.
 */
@Controller('api/v1/templates')
export class TemplatesController {
  constructor(private readonly templateService: TemplateService) {}

  /**
   * Create a new template
   */
  @Post()
  async create(@Body() dto: CreateTemplateDto) {
    return this.templateService.createTemplate(dto);
  }

  /**
   * Get all templates
   */
  @Get()
  async findAll(
    @Query('type') type?: NotificationType,
    @Query('active') active?: string
  ) {
    const isActive = active === 'true' ? true : active === 'false' ? false : undefined;
    return this.templateService.findAll({ type, isActive });
  }

  /**
   * Get template by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.templateService.findById(id);
  }

  /**
   * Get template by name
   */
  @Get('name/:name')
  async findByName(@Param('name') name: string) {
    return this.templateService.findByName(name);
  }

  /**
   * Update template
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templateService.updateTemplate(id, dto);
  }

  /**
   * Delete template
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.templateService.deleteTemplate(id);
  }

  /**
   * Activate template
   */
  @Post(':id/activate')
  async activate(@Param('id') id: string) {
    return this.templateService.activateTemplate(id);
  }

  /**
   * Deactivate template
   */
  @Post(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.templateService.deactivateTemplate(id);
  }
}
