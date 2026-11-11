import type { WeatherData } from '../types/weather';

export const mockWeatherData: WeatherData = {
  city: {
    id: 3448439,
    name: 'São Paulo',
    country: 'Brasil',
    region: 'São Paulo',
    latitude: -23.5475,
    longitude: -46.63611,
  },
  timezone: 'America/Sao_Paulo',
  current: {
    observedAt: '2026-11-11T15:00',
    weatherCode: 2,
    temperatureC: 23,
    apparentTemperatureC: 24,
    relativeHumidity: 64,
    windSpeedKmh: 12,
    precipitationMm: 0,
    surfacePressureHpa: 1015,
  },
  forecast: [
    { date: '2026-11-11', weatherCode: 2, minTemperatureC: 17, maxTemperatureC: 26, precipitationProbability: 0 },
    { date: '2026-11-12', weatherCode: 3, minTemperatureC: 18, maxTemperatureC: 25, precipitationProbability: 30 },
    { date: '2026-11-13', weatherCode: 61, minTemperatureC: 17, maxTemperatureC: 24, precipitationProbability: 80 },
    { date: '2026-11-14', weatherCode: 1, minTemperatureC: 16, maxTemperatureC: 27, precipitationProbability: 10 },
    { date: '2026-11-15', weatherCode: 0, minTemperatureC: 18, maxTemperatureC: 28, precipitationProbability: 0 },
  ],
};
