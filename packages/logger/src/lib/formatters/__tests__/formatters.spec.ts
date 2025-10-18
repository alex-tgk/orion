import { jsonFormatter } from '../json.formatter';
import { developmentFormatter } from '../development.formatter';

describe('Formatters', () => {
  describe('JSON Formatter', () => {
    it('should be defined', () => {
      expect(jsonFormatter).toBeDefined();
    });

    it('should be a Winston format', () => {
      expect(jsonFormatter).toHaveProperty('transform');
    });
  });

  describe('Development Formatter', () => {
    it('should be defined', () => {
      expect(developmentFormatter).toBeDefined();
    });

    it('should be a Winston format', () => {
      expect(developmentFormatter).toHaveProperty('transform');
    });
  });
});
