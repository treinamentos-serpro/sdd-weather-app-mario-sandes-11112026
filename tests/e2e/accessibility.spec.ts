import { expect, test } from '@playwright/test';
import { mockApis, selectCity } from './weatherFixtures';

test.beforeEach(async ({ page }) => {
  await mockApis(page);
});

for (const width of [320, 375, 768, 1024, 1440, 1920]) {
  test(`layout sem rolagem horizontal em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.getByRole('textbox', { name: 'Buscar cidade' }).fill('Seattle');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await selectCity(page, 'Seattle');
    await expect(page.getByRole('region', { name: 'Clima atual' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );

    const cards = page.getByRole('region', { name: 'Previsão de 5 dias' }).getByRole('list');
    const columns = await cards.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
    );
    expect(columns).toBe(width >= 1024 ? 5 : width >= 640 ? 3 : 2);

    for (const button of await page.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }

    await page.route('**/geocoding-api.open-meteo.com/**', (route) => route.fulfill({ json: {} }));
    await page.getByRole('textbox', { name: 'Buscar cidade' }).fill('X'.repeat(150));
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Nenhuma cidade encontrada/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.route('**/geocoding-api.open-meteo.com/**', (route) =>
      route.fulfill({ status: 500, json: {} }),
    );
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}

test('atalho de conteúdo recebe foco e leva ao conteúdo principal', async ({
  page,
  browserName,
}) => {
  await page.goto('/');
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  const skipLink = page.getByRole('link', { name: 'Pular para o conteúdo' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

test('busca desabilitada não muda de cor no hover', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('button', { name: 'Buscar', exact: true });
  await expect(search).toBeDisabled();
  const background = await search.evaluate((element) => getComputedStyle(element).backgroundColor);
  await search.hover();
  await expect(search).toHaveCSS('background-color', background);
  await page.getByRole('textbox', { name: 'Buscar cidade' }).fill('Seattle');
  await expect(search).toBeEnabled();
  await search.hover();
  await expect(search).not.toHaveCSS('background-color', background);
});

test('controles funcionam pelo teclado com foco visível', async ({ page, browserName }) => {
  const next = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  const previous = browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab';
  await page.goto('/');
  await page.keyboard.press(next);
  await page.keyboard.press(next);
  const input = page.getByRole('textbox', { name: 'Buscar cidade' });
  await expect(input).toBeFocused();
  await input.fill('Seattle');
  await page.keyboard.press('Enter');
  const cityResult = page.getByRole('button', { name: /Seattle.*Washington/ });
  await expect(cityResult).toBeVisible();
  await cityResult.focus();
  await expect(cityResult).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'Clima atual' })).toBeVisible();
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'false');
  await page.keyboard.press(previous);
  await expect(page.getByRole('button', { name: '°F' })).toBeFocused();
  await page.keyboard.press(previous);
  await expect(page.getByRole('button', { name: '°C' })).toBeFocused();
  await page.keyboard.press(previous);
  await expect(page.getByRole('button', { name: 'Buscar', exact: true })).toBeFocused();
  await page.keyboard.press(next);
  await expect(page.getByRole('button', { name: '°C' })).toBeFocused();
  await page.keyboard.press(next);
  const fahrenheit = page.getByRole('button', { name: '°F' });
  await expect(fahrenheit).toBeFocused();
  expect(await fahrenheit.evaluate((element) => getComputedStyle(element).outlineWidth)).toBe(
    '2px',
  );
  await page.keyboard.press('Space');
  await expect(fahrenheit).toHaveAttribute('aria-pressed', 'true');
  await expect(fahrenheit).toBeFocused();
});

test('loading respeita preferência por movimento reduzido', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/geocoding-api.open-meteo.com/**', async (route) => {
    await pending;
    await route.fulfill({ json: {} });
  });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Buscar cidade' }).fill('Seattle');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  const spinner = page.getByRole('status', { name: 'Carregando o clima' }).locator('span');
  await expect(spinner).toBeVisible();
  await expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'true');
  expect(await spinner.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  );
  release();
  await expect(page.getByRole('heading', { name: /Nenhuma cidade encontrada/ })).toBeVisible();
  await expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'false');
});
