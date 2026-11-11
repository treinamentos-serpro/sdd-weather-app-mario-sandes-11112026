import { expect, type Route, test } from '@playwright/test';
import { mockApis, selectCity } from './weatherFixtures';

for (const term of ['', '   ']) {
  test(`busca em branco ${JSON.stringify(term)} orienta sem acessar a API`, async ({ page }) => {
    const requests: string[] = [];
    await page.route('**/*open-meteo.com/**', (route) => {
      requests.push(route.request().url());
      return route.fulfill({ json: {} });
    });
    await page.goto('/');
    const input = page.getByLabel('Buscar cidade', { exact: true });
    await input.fill(term);
    await expect(page.getByRole('button', { name: 'Buscar', exact: true })).toBeDisabled();
    await input.press('Enter');
    await expect(
      page.getByText('Digite uma cidade para pesquisar.', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('region', { name: 'Clima atual' })).toHaveCount(0);
    expect(requests).toHaveLength(0);
  });
}

test('busca preserva acentos e codifica caracteres especiais sem criar parâmetros extras', async ({
  page,
}) => {
  await mockApis(page);
  const term = "São Paulo & D'Ávila + /?";
  const requestPromise = page.waitForRequest(
    (request) => new URL(request.url()).hostname === 'geocoding-api.open-meteo.com',
  );
  await page.goto('/');
  await page.getByLabel('Buscar cidade', { exact: true }).fill(`  ${term}  `);
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  const url = new URL((await requestPromise).url());
  expect(url.searchParams.get('name')).toBe(term);
  expect([...url.searchParams.keys()]).toEqual(['name', 'count', 'language', 'format']);
  await selectCity(page, 'Seattle');
  await expect(page.getByRole('heading', { name: 'Seattle', exact: true })).toBeVisible();
});

test('exibe até cinco resultados em ordem e consulta somente a cidade escolhida', async ({
  page,
}) => {
  const forecastRequests: string[] = [];
  await page.route('**/geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: {
        results: Array.from({ length: 6 }, (_, index) => ({
          id: index + 1,
          name: 'Springfield',
          country: 'Estados Unidos',
          admin1: `Estado ${index + 1}`,
          latitude: index + 1,
          longitude: index + 1,
        })),
      },
    }),
  );
  await page.route('**/api.open-meteo.com/**', (route) => {
    forecastRequests.push(route.request().url());
    return route.fulfill({
      json: {
        timezone: 'UTC',
        current: { temperature_2m: 23, weather_code: 0 },
        daily: { time: [] },
      },
    });
  });
  await page.goto('/');
  await page.getByLabel('Buscar cidade', { exact: true }).fill('Springfield');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();

  const results = page.getByRole('region', { name: 'Resultados da busca' }).getByRole('listitem');
  await expect(results).toHaveCount(5);
  await expect(results.nth(0)).toContainText('Estado 1');
  await expect(results.nth(4)).toContainText('Estado 5');
  expect(forecastRequests).toHaveLength(0);

  await page.getByRole('button', { name: /Springfield Estado 2/ }).click();
  await expect(page.getByLabel('Temperatura: 23° C', { exact: true })).toBeVisible();
  expect(new URL(forecastRequests[0]).searchParams.get('latitude')).toBe('2');
});

for (const missing of ['current', 'daily'] as const) {
  for (const value of [undefined, null]) {
    test(`forecast com ${missing} ${value === null ? 'null' : 'omitido'} mostra erro e permite retry`, async ({
      page,
    }) => {
      await mockApis(page);
      const body = {
        timezone: 'America/Los_Angeles',
        current: {},
        daily: { time: [] },
        [missing]: value,
      };
      const incomplete = (route: Route) => route.fulfill({ json: body });
      await page.route('**/api.open-meteo.com/**', incomplete);
      await page.goto('/');
      await page.getByLabel('Buscar cidade', { exact: true }).fill('Seattle');
      await page.getByRole('button', { name: 'Buscar', exact: true }).click();
      await selectCity(page, 'Seattle');
      await expect(page.getByRole('alert')).toContainText(
        'Não foi possível carregar os dados. Tente novamente.',
      );
      await expect(page.getByRole('status', { name: 'Carregando o clima' })).toHaveCount(0);
      await expect(page.getByRole('region', { name: 'Clima atual' })).toHaveCount(0);
      await expect(page.getByRole('region', { name: 'Previsão de 5 dias' })).toHaveCount(0);
      await page.unroute('**/api.open-meteo.com/**', incomplete);
      await page.getByRole('button', { name: 'Tentar novamente' }).click();
      await expect(page.getByRole('heading', { name: 'Seattle', exact: true })).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);
    });
  }
}

for (const stage of ['geocoding', 'forecast']) {
  test(`rede offline em ${stage} permite repetir exatamente a operação após reconexão`, async ({
    page,
  }) => {
    await mockApis(page);
    const calls: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).hostname.endsWith('open-meteo.com')) calls.push(request.url());
    });
    const endpoint =
      stage === 'geocoding' ? '**/geocoding-api.open-meteo.com/**' : '**/api.open-meteo.com/**';
    const offline = (route: Route) => route.abort('internetdisconnected');
    await page.route(endpoint, offline);
    await page.goto('/');
    await page.getByLabel('Buscar cidade', { exact: true }).fill('Seattle');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    if (stage === 'forecast') await selectCity(page, 'Seattle');
    await expect(
      page
        .getByRole('alert')
        .getByText('Não foi possível carregar os dados. Tente novamente.', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('status', { name: 'Carregando o clima' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Clima atual' })).toHaveCount(0);
    const failedUrl = calls[calls.length - 1];
    await page.unroute(endpoint, offline);
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    if (stage === 'geocoding') await selectCity(page, 'Seattle');
    await expect(page.getByRole('heading', { name: 'Seattle' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    const retries = calls.filter((url) => url === failedUrl);
    expect(retries).toHaveLength(2);
    expect(
      calls.filter((url) => new URL(url).hostname === 'geocoding-api.open-meteo.com'),
    ).toHaveLength(stage === 'geocoding' ? 2 : 1);
  });
}

test('fluxo completo: buscar → clima atual → previsão → trocar unidade', async ({ page }) => {
  await mockApis(page);
  await page.goto('/');

  await page.getByLabel(/buscar cidade/i).fill('Seattle');
  await page.getByRole('button', { name: /buscar/i }).click();
  await selectCity(page, 'Seattle');

  await expect(page.getByRole('heading', { name: 'Seattle' })).toBeVisible();
  const forecast = page.getByRole('region', { name: 'Previsão de 5 dias' });
  await expect(forecast).toBeVisible();
  await expect(forecast.getByRole('listitem')).toHaveCount(5);

  const celsius = page.getByLabel('Temperatura: 0° C', { exact: true });
  await expect(celsius).toBeVisible();
  await expect(celsius).toHaveText('0°');
  await page.getByRole('button', { name: '°F' }).click();
  const fahrenheit = page.getByLabel('Temperatura: 32° F', { exact: true });
  await expect(fahrenheit).toBeVisible();
  await expect(fahrenheit).toHaveText('32°');
  await expect(page.getByRole('button', { name: '°F' })).toHaveAttribute('aria-pressed', 'true');
});

for (const response of [{}, { results: [] }]) {
  test(`estado vazio quando geocoding retorna ${JSON.stringify(response)}`, async ({ page }) => {
    const forecastRequests: string[] = [];
    await page.route('**/api.open-meteo.com/**', (route) => {
      forecastRequests.push(route.request().url());
      return route.fulfill({ json: {} });
    });
    await page.route('**/geocoding-api.open-meteo.com/**', (route) =>
      route.fulfill({ json: response }),
    );
    await page.goto('/');

    await page.getByLabel(/buscar cidade/i).fill('xyzxyz');
    await page.getByRole('button', { name: /buscar/i }).click();

    await expect(page.getByRole('heading', { name: 'Nenhuma cidade encontrada.' })).toBeVisible();
    await expect(page.getByLabel(/buscar cidade/i)).toHaveValue('xyzxyz');
    await expect(page.getByRole('region', { name: 'Clima atual' })).toHaveCount(0);
    expect(forecastRequests).toHaveLength(0);
  });
}

test('viewport mobile renderiza o fluxo principal', async ({ page }) => {
  await mockApis(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  await page.getByLabel(/buscar cidade/i).fill('Seattle');
  await page.getByRole('button', { name: /buscar/i }).click();
  await selectCity(page, 'Seattle');
  await expect(page.getByRole('heading', { name: 'Seattle' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Clima atual' })).toBeVisible();
  await expect(page.getByLabel('Temperatura: 0° C', { exact: true })).toHaveText('0°');
  const forecast = page.getByRole('region', { name: 'Previsão de 5 dias' });
  await expect(forecast).toBeVisible();
  await expect(forecast.getByRole('listitem')).toHaveCount(5);
  await page.getByRole('button', { name: '°F' }).click();
  await expect(page.getByLabel('Temperatura: 32° F', { exact: true })).toHaveText('32°');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

for (const stage of ['geocoding', 'forecast']) {
  test(`falha HTTP em ${stage} oculta clima antigo e permite retry`, async ({ page }) => {
    await mockApis(page);
    await page.goto('/');
    const input = page.getByLabel('Buscar cidade', { exact: true });
    await input.fill('Seattle');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await selectCity(page, 'Seattle');
    await expect(page.getByRole('heading', { name: 'Seattle' })).toBeVisible();

    const endpoint =
      stage === 'geocoding' ? '**/geocoding-api.open-meteo.com/**' : '**/api.open-meteo.com/**';
    await page.route(endpoint, (route) => route.fulfill({ status: 503, json: {} }));
    await input.fill('Outra cidade');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    if (stage === 'forecast') await selectCity(page, 'Seattle');
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Clima atual' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Previsão de 5 dias' })).toHaveCount(0);
    await expect(page.getByRole('status', { name: 'Carregando o clima' })).toHaveCount(0);

    await page.unroute(endpoint);
    await mockApis(page);
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    if (stage === 'geocoding') await selectCity(page, 'Seattle');
    await expect(page.getByRole('heading', { name: 'Seattle' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}

test('resposta parcial mantém cinco dias e converte só valores disponíveis sem nova rede', async ({
  page,
}) => {
  await mockApis(page);
  let forecastRequests = 0;
  await page.route('**/api.open-meteo.com/**', (route) => {
    forecastRequests += 1;
    return route.fulfill({
      json: {
        timezone: 'America/Los_Angeles',
        current: { temperature_2m: 0, weather_code: 0 },
        daily: {
          time: ['2026-06-16', '2026-06-18'],
          temperature_2m_max: [20, null],
          temperature_2m_min: [0, null],
        },
      },
    });
  });
  await page.goto('/');
  await page.getByLabel('Buscar cidade', { exact: true }).fill('Seattle');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await selectCity(page, 'Seattle');
  const hero = page.getByRole('region', { name: 'Clima atual' });
  await expect(hero).toBeVisible();
  await expect(hero.getByRole('definition')).toHaveText([
    'Indisponível',
    'Indisponível',
    'Indisponível',
    'Indisponível',
  ]);
  await expect(hero.getByText('Horário de referência indisponível')).toBeVisible();
  const cards = page.getByRole('region', { name: 'Previsão de 5 dias' }).getByRole('listitem');
  await expect(cards).toHaveCount(5);
  await expect(cards.nth(1).getByText('Amanhã', { exact: true })).toBeVisible();
  await expect(cards.nth(1).getByText('17 Jun', { exact: true })).toBeVisible();
  await expect(page.getByText('Previsão indisponível', { exact: true })).toHaveCount(4);
  await expect(cards.nth(0).getByText('Chuva: Indisponível')).toBeVisible();

  await page.getByRole('button', { name: '°F' }).click();
  await expect(page.getByLabel('Temperatura: 32° F', { exact: true })).toHaveText('32°');
  await expect(cards.nth(0).getByText('Máx: 68°')).toBeVisible();
  await expect(cards.nth(0).getByText('Mín: 32°')).toBeVisible();
  await expect(cards.nth(1).getByText('Máx: Indisponível')).toBeVisible();
  await expect(hero.getByText('Sensação térmica: Indisponível')).toBeVisible();
  await page.getByRole('button', { name: '°C' }).click();
  await expect(page.getByLabel('Temperatura: 0° C', { exact: true })).toHaveText('0°');
  await expect(cards.nth(0).getByText('Máx: 20°')).toBeVisible();
  expect(forecastRequests).toBe(1);
  await page.getByRole('button', { name: '°F' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: '°C' })).toHaveAttribute('aria-pressed', 'true');
});

test('temperaturas negativas e extremas convertem em todos os campos e voltam a Celsius', async ({
  page,
}) => {
  await mockApis(page);
  let forecastRequests = 0;
  await page.route('**/api.open-meteo.com/**', (route) => {
    forecastRequests += 1;
    return route.fulfill({
      json: {
        timezone: 'America/Los_Angeles',
        current: { temperature_2m: -20.5, apparent_temperature: -40 },
        daily: {
          time: ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20'],
          temperature_2m_min: [-40, -40, -40, -40, -40],
          temperature_2m_max: [100, 100, 100, 100, 100],
        },
      },
    });
  });
  await page.goto('/');
  await page.getByLabel('Buscar cidade', { exact: true }).fill('Seattle');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await selectCity(page, 'Seattle');
  await expect(page.getByLabel('Temperatura: -21° C', { exact: true })).toHaveText('-21°');
  await page.getByRole('button', { name: '°F' }).click();
  await expect(page.getByLabel('Temperatura: -5° F', { exact: true })).toHaveText('-5°');
  await expect(page.getByText('Sensação térmica: -40°')).toBeVisible();
  await expect(page.getByText('Máx: 212°', { exact: true })).toHaveCount(5);
  await expect(page.getByText('Mín: -40°', { exact: true })).toHaveCount(5);
  await page.getByRole('button', { name: '°C' }).click();
  await expect(page.getByLabel('Temperatura: -21° C', { exact: true })).toHaveText('-21°');
  await expect(page.getByText('Máx: 100°', { exact: true })).toHaveCount(5);
  expect(forecastRequests).toBe(1);
});

test('p95 de busca e consulta meteorológica atende às metas com respostas controladas', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Medição de desempenho executada no Chromium desktop.');
  await mockApis(page);
  await page.unroute('**/geocoding-api.open-meteo.com/**');
  await page.unroute('**/api.open-meteo.com/**');
  await page.route('**/geocoding-api.open-meteo.com/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.fulfill({
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
    });
  });
  await page.route('**/api.open-meteo.com/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.fulfill({
      json: {
        timezone: 'America/Los_Angeles',
        current: { temperature_2m: 20, weather_code: 0 },
        daily: { time: ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20'] },
      },
    });
  });
  await page.goto('/');

  const searchDurations: number[] = [];
  const weatherDurations: number[] = [];
  const input = page.getByLabel('Buscar cidade', { exact: true });
  const forecast = page.getByRole('region', { name: 'Previsão de 5 dias' });
  for (let iteration = 0; iteration < 30; iteration += 1) {
    await input.fill(`Seattle ${iteration}`);
    const searchStart = await page.evaluate(() => performance.now());
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    const result = page.getByRole('button', { name: /Seattle.*Washington/ });
    await expect(result).toBeVisible();
    searchDurations.push(await page.evaluate((start) => performance.now() - start, searchStart));

    const weatherStart = await page.evaluate(() => performance.now());
    await result.click();
    await expect(page.getByRole('region', { name: 'Clima atual' })).toBeVisible();
    await expect(forecast.getByRole('listitem')).toHaveCount(5);
    weatherDurations.push(await page.evaluate((start) => performance.now() - start, weatherStart));
  }

  const p95 = (durations: number[]) =>
    [...durations].sort((left, right) => left - right)[Math.ceil(durations.length * 0.95) - 1];
  expect(p95(searchDurations)).toBeLessThanOrEqual(3_000);
  expect(p95(weatherDurations)).toBeLessThanOrEqual(5_000);
});
