/**
 * Visual Regression Tests
 * Tests visual consistency of admin-ui components
 */

import percySnapshot from '@percy/puppeteer';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('Admin UI Visual Regression Tests', () => {
  let browser: Browser;
  let page: Page;

  const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Dashboard Views', () => {
    it('should match dashboard snapshot', async () => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForSelector('.dashboard-container');

      await percySnapshot(page, 'Dashboard - Overview', {
        widths: [375, 768, 1280, 1920],
      });
    });

    it('should match dashboard with filters', async () => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForSelector('.filter-panel');

      // Apply filters
      await page.click('.filter-button');
      await page.waitForSelector('.filter-dropdown');

      await percySnapshot(page, 'Dashboard - With Filters', {
        widths: [768, 1280],
      });
    });

    it('should match dashboard with dark mode', async () => {
      await page.goto(`${BASE_URL}/dashboard`);

      // Enable dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await percySnapshot(page, 'Dashboard - Dark Mode', {
        widths: [1280],
      });
    });
  });

  describe('Service Management', () => {
    it('should match services list', async () => {
      await page.goto(`${BASE_URL}/services`);
      await page.waitForSelector('.services-list');

      await percySnapshot(page, 'Services - List View', {
        widths: [768, 1280],
      });
    });

    it('should match service details', async () => {
      await page.goto(`${BASE_URL}/services/auth`);
      await page.waitForSelector('.service-details');

      await percySnapshot(page, 'Services - Detail View', {
        widths: [768, 1280],
      });
    });

    it('should match service health indicators', async () => {
      await page.goto(`${BASE_URL}/services`);
      await page.waitForSelector('.health-indicator');

      await percySnapshot(page, 'Services - Health Indicators', {
        widths: [375, 768, 1280],
      });
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should match metrics dashboard', async () => {
      await page.goto(`${BASE_URL}/metrics`);
      await page.waitForSelector('.metrics-container');

      // Wait for charts to render
      await page.waitForTimeout(2000);

      await percySnapshot(page, 'Metrics - Dashboard', {
        widths: [1280, 1920],
      });
    });

    it('should match real-time metrics', async () => {
      await page.goto(`${BASE_URL}/metrics/realtime`);
      await page.waitForSelector('.realtime-metrics');

      await percySnapshot(page, 'Metrics - Real-time View', {
        widths: [1280],
      });
    });
  });

  describe('Events and Alerts', () => {
    it('should match events list', async () => {
      await page.goto(`${BASE_URL}/events`);
      await page.waitForSelector('.events-list');

      await percySnapshot(page, 'Events - List View', {
        widths: [768, 1280],
      });
    });

    it('should match alert notifications', async () => {
      await page.goto(`${BASE_URL}/dashboard`);

      // Trigger alert
      await page.evaluate(() => {
        const event = new CustomEvent('show-alert', {
          detail: { type: 'error', message: 'Test alert' },
        });
        window.dispatchEvent(event);
      });

      await page.waitForSelector('.alert-notification');

      await percySnapshot(page, 'Alerts - Error Notification', {
        widths: [375, 768],
      });
    });
  });

  describe('Responsive Design', () => {
    it('should match mobile layout', async () => {
      await page.setViewport({ width: 375, height: 812 });
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForSelector('.dashboard-container');

      await percySnapshot(page, 'Responsive - Mobile Dashboard', {
        widths: [375],
      });
    });

    it('should match tablet layout', async () => {
      await page.setViewport({ width: 768, height: 1024 });
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForSelector('.dashboard-container');

      await percySnapshot(page, 'Responsive - Tablet Dashboard', {
        widths: [768],
      });
    });

    it('should match desktop layout', async () => {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForSelector('.dashboard-container');

      await percySnapshot(page, 'Responsive - Desktop Dashboard', {
        widths: [1920],
      });
    });
  });

  describe('Component Library', () => {
    it('should match button variants', async () => {
      await page.goto(`${BASE_URL}/components/buttons`);
      await page.waitForSelector('.button-showcase');

      await percySnapshot(page, 'Components - Buttons', {
        widths: [768],
      });
    });

    it('should match form elements', async () => {
      await page.goto(`${BASE_URL}/components/forms`);
      await page.waitForSelector('.form-showcase');

      await percySnapshot(page, 'Components - Forms', {
        widths: [768],
      });
    });

    it('should match modals', async () => {
      await page.goto(`${BASE_URL}/components/modals`);
      await page.waitForSelector('.modal-showcase');

      // Open modal
      await page.click('.open-modal-button');
      await page.waitForSelector('.modal-overlay');

      await percySnapshot(page, 'Components - Modal', {
        widths: [768, 1280],
      });
    });
  });

  describe('Error States', () => {
    it('should match 404 page', async () => {
      await page.goto(`${BASE_URL}/non-existent-page`);
      await page.waitForSelector('.error-404');

      await percySnapshot(page, 'Error - 404 Page', {
        widths: [375, 768, 1280],
      });
    });

    it('should match error boundary', async () => {
      await page.goto(`${BASE_URL}/test-error`);
      await page.waitForSelector('.error-boundary');

      await percySnapshot(page, 'Error - Error Boundary', {
        widths: [768],
      });
    });
  });

  describe('Loading States', () => {
    it('should match loading spinner', async () => {
      await page.goto(`${BASE_URL}/loading-test`);
      await page.waitForSelector('.loading-spinner');

      await percySnapshot(page, 'Loading - Spinner', {
        widths: [375, 768],
      });
    });

    it('should match skeleton screens', async () => {
      await page.goto(`${BASE_URL}/skeleton-test`);
      await page.waitForSelector('.skeleton-loader');

      await percySnapshot(page, 'Loading - Skeleton Screen', {
        widths: [768, 1280],
      });
    });
  });
});
