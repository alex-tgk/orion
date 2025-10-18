// Mock uuid for Jest testing
export const v4 = jest.fn(() => '123e4567-e89b-12d3-a456-426614174000');
export const v1 = jest.fn(() => '123e4567-e89b-11d3-a456-426614174000');
export const v5 = jest.fn(() => '123e4567-e89b-15d3-a456-426614174000');
export const v6 = jest.fn(() => '123e4567-e89b-16d3-a456-426614174000');
export const v7 = jest.fn(() => '123e4567-e89b-17d3-a456-426614174000');
export const validate = jest.fn(() => true);
export const version = jest.fn(() => 4);
export const NIL = '00000000-0000-0000-0000-000000000000';
export const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

export default {
  v4,
  v1,
  v5,
  v6,
  v7,
  validate,
  version,
  NIL,
  MAX,
};
