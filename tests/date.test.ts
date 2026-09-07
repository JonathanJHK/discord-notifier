import { describe, expect, it } from 'vitest';

import { addDays } from '../src/utils/date.js';

describe('addDays', () => {
  it('deve adicionar dias corretamente', () => {
    expect(addDays('2026-09-07', 2)).toBe('2026-09-09');
  });

  it('deve subtrair dias corretamente', () => {
    expect(addDays('2026-09-07', -2)).toBe('2026-09-05');
  });

  it('deve atravessar mudança de mês', () => {
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31');
  });

  it('deve atravessar mudança de ano', () => {
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });
});
