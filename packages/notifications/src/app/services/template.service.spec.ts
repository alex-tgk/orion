import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TemplateService } from './template.service';
import { NotificationPrismaService } from './notification-prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('TemplateService', () => {
  let service: TemplateService;

  const mockPrismaService = {
    template: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        {
          provide: NotificationPrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('render', () => {
    it('should render template from database', async () => {
      const mockTemplate = {
        id: 'test-id',
        name: 'test-template',
        type: 'email',
        subject: 'Hello {{name}}',
        body: '<p>Welcome {{name}}!</p>',
        variables: ['name'],
        isActive: true,
      };

      mockPrismaService.template.findUnique.mockResolvedValue(mockTemplate);

      const result = await service.render('test-template', { name: 'John' });

      expect(result).toEqual({
        subject: 'Hello John',
        body: '<p>Welcome John!</p>',
      });
    });

    it('should handle missing template gracefully', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue(null);

      await expect(
        service.render('non-existent', { name: 'John' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTemplate', () => {
    it('should create or update template', async () => {
      mockPrismaService.template.upsert.mockResolvedValue({
        id: 'test-id',
        name: 'test-template',
        type: 'email',
        subject: 'Test',
        body: 'Body',
        variables: [],
        isActive: true,
      });

      await service.createTemplate(
        'test-template',
        'email' as any,
        'Test Subject',
        'Test Body',
        [],
      );

      expect(mockPrismaService.template.upsert).toHaveBeenCalledWith({
        where: { name: 'test-template' },
        create: expect.any(Object),
        update: expect.any(Object),
      });
    });
  });

  describe('validateData', () => {
    it('should validate required variables are present', () => {
      expect(service.validateData(['name', 'email'], { name: 'John', email: 'john@example.com' })).toBe(true);
    });

    it('should reject when required variables are missing', () => {
      expect(service.validateData(['name', 'email'], { name: 'John' })).toBe(false);
    });
  });
});
