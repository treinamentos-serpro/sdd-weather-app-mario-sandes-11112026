import { describe, it, expect } from 'vitest';
import { getWeatherInfo, getWeatherLabel, getWeatherIcon } from '../../src/lib/weatherCodes';

describe('weatherCodes', () => {
  it.each([
    [0, 'Céu limpo', '☀️'],
    [3, 'Nublado', '☁️'],
    [61, 'Chuva fraca', '🌦️'],
    [95, 'Trovoadas', '⛈️'],
  ])('mapeia código %s para rótulo e ícone conhecidos', (code, label, icon) => {
    expect(getWeatherInfo(code)).toEqual({ label, icon });
    expect(getWeatherLabel(code)).toBe(label);
    expect(getWeatherIcon(code)).toBe(icon);
  });

  it.each([123456, -1, null])('usa fallback para código desconhecido ou ausente: %s', (code) => {
    expect(getWeatherInfo(code)).toEqual({
      label: 'Condição desconhecida',
      icon: '🌡️',
    });
    expect(getWeatherLabel(code)).toBe('Condição desconhecida');
    expect(getWeatherIcon(code)).toBe('🌡️');
  });
});
