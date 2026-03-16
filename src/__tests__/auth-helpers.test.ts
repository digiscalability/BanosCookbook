import { describe, expect, it } from 'vitest';

import { slugifyUsername } from '../lib/firestore-users';

describe('slugifyUsername', () => {
  it('lowercases and removes invalid characters', () => {
    // trailing ! → _, but then trailing _ is trimmed
    expect(slugifyUsername('Chef Maria!')).toBe('chef_maria');
  });

  it('collapses repeated underscores', () => {
    expect(slugifyUsername('chef__maria')).toBe('chef_maria');
  });

  it('trims leading/trailing underscores', () => {
    expect(slugifyUsername('_chef_')).toBe('chef');
  });

  it('handles spaces', () => {
    expect(slugifyUsername('Maria Banos')).toBe('maria_banos');
  });

  it('truncates to 30 characters', () => {
    const long = 'a'.repeat(40);
    expect(slugifyUsername(long).length).toBeLessThanOrEqual(30);
  });

  it('preserves numbers and underscores', () => {
    expect(slugifyUsername('chef_123')).toBe('chef_123');
  });

  it('handles email-style input', () => {
    expect(slugifyUsername('maria@example.com')).toBe('maria_example_com');
  });
});
