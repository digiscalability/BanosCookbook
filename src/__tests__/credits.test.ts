import { describe, expect, it } from 'vitest';

import { getMonthlyLimit } from '../lib/firestore-credits';

describe('getMonthlyLimit', () => {
  it('free tier allows 2 videos', () => {
    expect(getMonthlyLimit('free')).toBe(2);
  });

  it('creator tier allows 15 videos', () => {
    expect(getMonthlyLimit('creator')).toBe(15);
  });

  it('pro tier is unlimited', () => {
    expect(getMonthlyLimit('pro')).toBe(Infinity);
  });
});
