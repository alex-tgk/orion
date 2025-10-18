import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Handlebars from 'handlebars';
import { NotificationPrismaService } from './notification-prisma.service';
import { NotificationType } from '../entities/notification.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templateCache = new Map<string, Handlebars.TemplateDelegate>();

  constructor(
    private readonly prisma: NotificationPrismaService,
    private readonly configService: ConfigService,
  ) {
    this.registerHelpers();
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    Handlebars.registerHelper('formatDate', (date: Date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    Handlebars.registerHelper('formatTime', (date: Date) => {
      return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    });

    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    Handlebars.registerHelper('lt', (a: number, b: number) => a < b);
  }

  /**
   * Render a template with data
   */
  async render(
    templateName: string,
    data: Record<string, any>,
  ): Promise<{ subject?: string; body: string }> {
    try {
      // Try to get template from database first
      const dbTemplate = await this.prisma.template.findUnique({
        where: { name: templateName },
      });

      if (dbTemplate && dbTemplate.isActive) {
        const subjectTemplate = dbTemplate.subject
          ? Handlebars.compile(dbTemplate.subject)
          : undefined;
        const bodyTemplate = Handlebars.compile(dbTemplate.body);

        return {
          subject: subjectTemplate ? subjectTemplate(data) : undefined,
          body: bodyTemplate(data),
        };
      }

      // Fallback to file-based templates
      const template = await this.loadTemplate(templateName);
      const compiled = this.compileTemplate(templateName, template.body);

      return {
        subject: template.subject
          ? Handlebars.compile(template.subject)(data)
          : undefined,
        body: compiled(data),
      };
    } catch (error) {
      this.logger.error(`Failed to render template ${templateName}:`, error);
      throw new NotFoundException(`Template ${templateName} not found`);
    }
  }

  /**
   * Load template from file system
   */
  private async loadTemplate(
    name: string,
  ): Promise<{ subject?: string; body: string }> {
    const templatesDir = path.join(
      __dirname,
      '../..',
      'assets',
      'templates',
    );
    const filePath = path.join(templatesDir, `${name}.hbs`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Extract subject from template if it exists
      const subjectMatch = content.match(/{{!--\s*SUBJECT:\s*(.+?)\s*--}}/);
      const subject = subjectMatch ? subjectMatch[1] : undefined;

      // Remove subject comment from body
      const body = content.replace(/{{!--\s*SUBJECT:.+?--}}\n?/, '');

      return { subject, body };
    } catch (error) {
      this.logger.error(`Failed to load template file ${name}:`, error);
      throw new NotFoundException(`Template file ${name}.hbs not found`);
    }
  }

  /**
   * Compile and cache template
   */
  private compileTemplate(name: string, template: string): Handlebars.TemplateDelegate {
    if (this.templateCache.has(name)) {
      return this.templateCache.get(name);
    }

    const compiled = Handlebars.compile(template);
    this.templateCache.set(name, compiled);
    return compiled;
  }

  /**
   * Create or update a template in the database
   */
  async createTemplate(
    name: string,
    type: NotificationType,
    subject: string | null,
    body: string,
    variables: string[],
  ): Promise<void> {
    await this.prisma.template.upsert({
      where: { name },
      create: {
        name,
        displayName: name,
        category: 'TRANSACTIONAL', // Default category
        channel: 'EMAIL', // Default channel, should be passed as parameter
        subject,
        body,
        variables: variables || [],
        isActive: true,
      },
      update: {
        subject,
        body,
        variables: variables || [],
        isActive: true,
        updatedAt: new Date(),
      },
    });

    // Clear cache
    this.templateCache.delete(name);
    this.logger.log(`Template ${name} created/updated`);
  }

  /**
   * Validate template variables
   */
  validateData(requiredVars: string[], providedData: Record<string, any>): boolean {
    return requiredVars.every((varName) => providedData[varName] !== undefined);
  }
}
