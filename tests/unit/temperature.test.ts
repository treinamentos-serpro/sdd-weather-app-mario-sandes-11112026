import { describe, it, expect } from 'vitest';
import {
  toFahrenheit,
  convertTemperature,
  formatTemperature,
  unitLabel,
} from '../../src/lib/temperature';

describe('temperature', () => {
  it.each([
    [0, 32],
    [100, 212],
    [-40, -40],
  ])('converte %s°C para %s°F', (celsius, fahrenheit) => {
    expect(toFahrenheit(celsius)).toBe(fahrenheit);
  });

  it('convertTemperature respeita a unidade', () => {
    expect(convertTemperature(20, 'celsius')).toBe(20);
    expect(convertTemperature(0, 'fahrenheit')).toBe(32);
    expect(convertTemperature(-40, 'fahrenheit')).toBe(-40);
    expect(convertTemperature(-12.25, 'celsius')).toBe(-12.25);
    expect(convertTemperature(20.25, 'fahrenheit')).toBeCloseTo(68.45);
  });

  it.each([
    [20.4, '20°'],
    [20.5, '21°'],
    [20.6, '21°'],
    [-20.4, '-20°'],
    [-20.5, '-21°'],
    [-20.6, '-21°'],
    [0, '0°'],
    [-0.4, '0°'],
  ])('formata %s°C como %s com arredondamento e símbolo', (celsius, formatted) => {
    expect(formatTemperature(celsius, 'celsius')).toBe(formatted);
  });

  it.each([
    [0, '32°'],
    [100, '212°'],
    [-40, '-40°'],
    [20.25, '68°'],
    [20.5, '69°'],
    [-22.5, '-9°'],
  ])('converte %s°C antes de arredondar e formatar em Fahrenheit: %s', (celsius, formatted) => {
    expect(formatTemperature(celsius, 'fahrenheit')).toBe(formatted);
  });

  it('retorna o rótulo da unidade', () => {
    expect(unitLabel('celsius')).toBe('°C');
    expect(unitLabel('fahrenheit')).toBe('°F');
  });
});
