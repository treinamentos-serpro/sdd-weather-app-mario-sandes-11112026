import { describe, it, expect } from 'vitest';
import { getDayLabel, getShortDate } from '../../src/lib/format';

describe('format', () => {
  it('rotula o primeiro e o segundo dia', () => {
    expect(getDayLabel('2026-06-16', 0)).toBe('Hoje');
    expect(getDayLabel('2026-06-17', 1)).toBe('Amanhã');
  });

  it.each([
    ['2026-06-14', 'Dom'],
    ['2026-06-15', 'Seg'],
    ['2026-06-16', 'Ter'],
    ['2026-06-17', 'Qua'],
    ['2026-06-18', 'Qui'],
    ['2026-06-19', 'Sex'],
    ['2026-06-20', 'Sáb'],
  ])('usa o dia da semana da data %s para índices posteriores', (date, label) => {
    expect(getDayLabel(date, 2)).toBe(label);
    expect(getDayLabel(date, 4)).toBe(label);
  });

  it('prioriza o índice para Hoje e Amanhã, inclusive na virada do ano', () => {
    expect(getDayLabel('2026-12-31', 0)).toBe('Hoje');
    expect(getDayLabel('2027-01-01', 1)).toBe('Amanhã');
  });

  it.each([
    ['2026-06-16', '16 Jun'],
    ['2026-01-01', '1 Jan'],
    ['2026-12-31', '31 Dez'],
    ['2026-03-01', '1 Mar'],
    ['2028-02-29', '29 Fev'],
  ])('formata a data local %s como %s', (date, formatted) => {
    expect(getShortDate(date)).toBe(formatted);
  });
});
