import type { Page } from '@playwright/test';

export async function mockApis(page: Page) {
  await page.clock.setFixedTime(new Date('2026-06-16T19:00:00Z'));
  await page.route('**/geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: {
        results: [
          {
            id: 1,
            name: 'Seattle',
            country: 'Estados Unidos',
            admin1: 'Washington',
            latitude: 47.6,
            longitude: -122.33,
          },
        ],
      },
    }),
  );
  await page.route('**/api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: {
        timezone: 'America/Los_Angeles',
        current: {
          time: '2026-06-16T12:00',
          temperature_2m: 0,
          apparent_temperature: -1,
          relative_humidity_2m: 80,
          wind_speed_10m: 10,
          surface_pressure: 1015,
          precipitation: 0,
          weather_code: 3,
        },
        daily: {
          time: ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20'],
          weather_code: [3, 61, 80, 1, 0],
          temperature_2m_max: [20, 19, 22, 24, 25],
          temperature_2m_min: [12, 11, 13, 14, 15],
          precipitation_probability_max: [20, 90, 70, 10, 0],
        },
      },
    }),
  );
}

export async function selectCity(page: Page, name: string) {
  await page.getByRole('button', { name: new RegExp(name) }).click();
}
