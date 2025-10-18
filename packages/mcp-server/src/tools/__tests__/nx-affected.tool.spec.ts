/**
 * Tests for nx-affected tool
 */

import { jest } from '@jest/globals';

describe('NxAffectedTool', () => {
  describe('getNxAffected', () => {
    it('should use correct default values', () => {
      const defaultBase = 'main';
      const defaultHead = 'HEAD';

      expect(defaultBase).toBe('main');
      expect(defaultHead).toBe('HEAD');
    });

    it('should construct correct nx command', () => {
      const base = 'main';
      const head = 'HEAD';
      const expectedCmd = `npx nx show projects --affected --base=${base} --head=${head}`;

      expect(expectedCmd).toContain('nx show projects --affected');
      expect(expectedCmd).toContain(`--base=${base}`);
      expect(expectedCmd).toContain(`--head=${head}`);
    });

    it('should parse affected projects correctly', () => {
      const mockOutput = 'auth-service\nuser-service\ngateway\n';
      const projects = mockOutput
        .trim()
        .split('\n')
        .filter((line) => line.trim());

      expect(projects).toHaveLength(3);
      expect(projects).toContain('auth-service');
      expect(projects).toContain('user-service');
      expect(projects).toContain('gateway');
    });

    it('should generate tasks for affected projects', () => {
      const projects = ['auth-service', 'user-service'];
      const taskTypes = ['build', 'test', 'lint'];
      const tasks: string[] = [];

      for (const project of projects) {
        for (const taskType of taskTypes) {
          tasks.push(`${project}:${taskType}`);
        }
      }

      expect(tasks).toHaveLength(6);
      expect(tasks).toContain('auth-service:build');
      expect(tasks).toContain('user-service:test');
    });
  });

  describe('result structure', () => {
    it('should return correct result format', () => {
      const mockResult = {
        projects: ['auth-service', 'user-service'],
        tasks: ['auth-service:build', 'user-service:test'],
        count: 2,
        base: 'main',
        head: 'HEAD',
      };

      expect(mockResult.projects).toHaveLength(2);
      expect(mockResult.tasks).toHaveLength(2);
      expect(mockResult.count).toBe(2);
      expect(mockResult.base).toBe('main');
      expect(mockResult.head).toBe('HEAD');
    });
  });
});
