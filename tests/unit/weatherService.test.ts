import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getWeather, searchCities, WeatherServiceError } from '../../src/services/weatherService';
import type { City } from '../../src/types/weather';

const CITY: City = {
  id: 1,
  name: 'Seattle',
  country: 'Estados Unidos',
  region: 'Washington',
  latitude: 47.6,
  longitude: -122.33,
};

function mockFetchOnce(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  } as Response);
}

describe('weatherService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('searchCities', () => {
    it.each([
      undefined,
      null,
      '',
      '   ',
    ])('normaliza país e região ausentes ou vazios: %j', async (value) => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce({
          results: [
            {
              id: CITY.id,
              name: CITY.name,
              latitude: CITY.latitude,
              longitude: CITY.longitude,
              country: value,
              admin1: value,
            },
          ],
        }),
      );
      expect(await searchCities('Seattle')).toEqual([
        {
          ...CITY,
          country: 'País indisponível',
          region: null,
        },
      ]);
    });

    it.each([
      null,
      { results: false },
      { results: {} },
      { results: [null] },
    ])('rejeita geocoding malformado em vez de tratar como vazio: %j', async (body) => {
      vi.stubGlobal('fetch', mockFetchOnce(body));
      await expect(searchCities('Seattle')).rejects.toBeInstanceOf(WeatherServiceError);
    });

    it.each([
      '',
      '   ',
      '\t\n',
    ])('retorna lista vazia para input %j sem chamar a rede', async (input) => {
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);
      const result = await searchCities(input);
      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('mapeia resultados de geocoding', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce({
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
        }),
      );
      const result = await searchCities('Seattle');
      expect(result).toEqual([CITY]);
    });

    it('limita geocoding aos cinco primeiros resultados sem alterar a ordem', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce({
          results: Array.from({ length: 6 }, (_, index) => ({
            id: index + 1,
            name: `Cidade ${index + 1}`,
            country: 'Brasil',
            latitude: index,
            longitude: index,
          })),
        }),
      );

      const results = await searchCities('Cidade');

      expect(results).toHaveLength(5);
      expect(results.map((result) => result.name)).toEqual([
        'Cidade 1',
        'Cidade 2',
        'Cidade 3',
        'Cidade 4',
        'Cidade 5',
      ]);
    });

    it('codifica o nome normalizado e inclui os parâmetros de geocoding', async () => {
      const fetchSpy = mockFetchOnce({ results: [] });
      vi.stubGlobal('fetch', fetchSpy);
      const name = 'São Paulo & região';

      expect(await searchCities(`  ${name}  `)).toEqual([]);
      expect(fetchSpy).toHaveBeenCalledExactlyOnceWith(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=pt&format=json`,
        { signal: expect.any(AbortSignal) },
      );
    });

    it('normaliza região ausente para null', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce({
          results: [
            {
              id: CITY.id,
              name: CITY.name,
              country: CITY.country,
              latitude: CITY.latitude,
              longitude: CITY.longitude,
            },
          ],
        }),
      );

      expect(await searchCities('Seattle')).toEqual([{ ...CITY, region: null }]);
    });

    it('retorna vazio quando não há results', async () => {
      vi.stubGlobal('fetch', mockFetchOnce({}));
      expect(await searchCities('xyzxyz')).toEqual([]);
    });

    it('lança erro tipado em resposta não-ok', async () => {
      vi.stubGlobal('fetch', mockFetchOnce({}, false));
      await expect(searchCities('Seattle')).rejects.toBeInstanceOf(WeatherServiceError);
    });
  });

  describe('fetchWithTimeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it.each([
      ['geocoding', () => searchCities('Seattle')],
      ['forecast', () => getWeather(CITY)],
    ])('normaliza JSON inválido em %s e limpa o timer', async (_, request) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockRejectedValue(new SyntaxError('Invalid JSON')),
        }),
      );
      await expect(request()).rejects.toBeInstanceOf(WeatherServiceError);
      expect(vi.getTimerCount()).toBe(0);
    });

    it.each([
      ['geocoding', () => searchCities('Seattle')],
      ['forecast', () => getWeather(CITY)],
    ])('mantém o timeout até terminar a leitura do corpo de %s', async (_, request) => {
      let signal: AbortSignal | undefined;
      vi.stubGlobal(
        'fetch',
        vi.fn((_url: string, init?: RequestInit) => {
          signal = init?.signal ?? undefined;
          return Promise.resolve({
            ok: true,
            json: () =>
              new Promise<unknown>((_resolve, reject) => {
                signal?.addEventListener(
                  'abort',
                  () => {
                    reject(new DOMException('Aborted', 'AbortError'));
                  },
                  { once: true },
                );
              }),
          });
        }),
      );
      // Registrar a rejeição imediatamente evita rejeições não tratadas nos fake timers.
      const outcome = request().then(
        () => ({ error: null }),
        (error: unknown) => ({ error }),
      );
      await vi.advanceTimersByTimeAsync(9_999);
      expect(signal?.aborted).toBe(false);
      expect(vi.getTimerCount()).toBe(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(signal?.aborted).toBe(true);
      expect((await outcome).error).toBeInstanceOf(WeatherServiceError);
      expect((await outcome).error).toHaveProperty('message', 'A requisição demorou demais.');
      expect((await outcome).error).toHaveProperty('kind', 'timeout');
      expect(vi.getTimerCount()).toBe(0);
    });

    it.each([
      ['geocoding', () => searchCities('Seattle')],
      ['forecast', () => getWeather(CITY)],
    ])('aborta %s após exatamente 10 segundos e limpa o timer', async (_, request) => {
      const controllerSpy = vi.spyOn(AbortController.prototype, 'abort');
      vi.stubGlobal(
        'fetch',
        vi.fn(
          (_url: string, init?: RequestInit) =>
            new Promise<Response>((_resolve, reject) => {
              init?.signal?.addEventListener(
                'abort',
                () => {
                  reject(new DOMException('Aborted', 'AbortError'));
                },
                { once: true },
              );
            }),
        ),
      );

      const pending = request();
      const rejection = expect(pending).rejects.toMatchObject({
        name: 'WeatherServiceError',
        message: 'A requisição demorou demais.',
        kind: 'timeout',
      });
      await vi.advanceTimersByTimeAsync(9_999);
      expect(controllerSpy).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await rejection;
      expect(controllerSpy).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('reconhece AbortError representado por Error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(Object.assign(new Error('Aborted'), { name: 'AbortError' })),
      );

      await expect(searchCities('Seattle')).rejects.toMatchObject({
        name: 'WeatherServiceError',
        message: 'A requisição demorou demais.',
      });
      expect(vi.getTimerCount()).toBe(0);
    });

    it.each([
      ['geocoding', () => searchCities('Seattle')],
      ['forecast', () => getWeather(CITY)],
    ])('converte rede offline em %s para erro tipado e limpa o timer', async (_, request) => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

      await expect(request()).rejects.toMatchObject({
        name: 'WeatherServiceError',
        message: 'Falha de rede.',
        kind: 'network',
      });
      expect(vi.getTimerCount()).toBe(0);
    });

    it('limpa o timer após sucesso sem abortar posteriormente', async () => {
      const controllerSpy = vi.spyOn(AbortController.prototype, 'abort');
      vi.stubGlobal('fetch', mockFetchOnce({ results: [] }));

      expect(await searchCities('Seattle')).toEqual([]);
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(10_000);
      expect(controllerSpy).not.toHaveBeenCalled();
    });
  });

  describe('getWeather', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-17T01:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it.each([
      undefined,
      null,
    ])('normaliza todas as métricas atuais e arrays diários ausentes: %j', async (value) => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce({
          timezone: 'America/Los_Angeles',
          current: {
            time: value,
            temperature_2m: value,
            apparent_temperature: value,
            relative_humidity_2m: value,
            wind_speed_10m: value,
            precipitation: value,
            surface_pressure: value,
            weather_code: value,
          },
          daily: {
            time: ['2026-06-16'],
            weather_code: value,
            temperature_2m_min: value,
            temperature_2m_max: value,
            precipitation_probability_max: value,
          },
        }),
      );
      const data = await getWeather(CITY);
      expect(Object.values(data.current)).toEqual(Array(8).fill(null));
      expect(data.forecast).toHaveLength(5);
      for (const day of data.forecast) {
        expect(day).toEqual({
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          weatherCode: null,
          minTemperatureC: null,
          maxTemperatureC: null,
          precipitationProbability: null,
        });
      }
    });

    it.each([
      null,
      { current: { temperature_2m: 'quente' } },
      { current: { temperature_2m: Number.NaN } },
      { daily: { time: [null] } },
      { daily: { time: ['2026-06-16'], temperature_2m_max: '20' } },
      { daily: { time: ['2026-06-16'], temperature_2m_max: ['20'] } },
    ])('rejeita estrutura inválida sem publicar dados como válidos: %j', async (invalid) => {
      const body =
        invalid === null
          ? null
          : {
              current: {},
              daily: { time: [] },
              timezone: 'America/Los_Angeles',
              ...invalid,
            };
      vi.stubGlobal('fetch', mockFetchOnce(body));
      await expect(getWeather(CITY)).rejects.toBeInstanceOf(WeatherServiceError);
    });

    it.each([
      [
        '2026-12-31T12:00:00Z',
        'Pacific/Kiritimati',
        ['2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04', '2027-01-05'],
      ],
      [
        '2028-02-28T12:00:00Z',
        'America/Sao_Paulo',
        ['2028-02-28', '2028-02-29', '2028-03-01', '2028-03-02', '2028-03-03'],
      ],
    ])('preserva cinco datas locais na virada temporal %s em %s', async (now, timezone, dates) => {
      vi.setSystemTime(new Date(now));
      vi.stubGlobal('fetch', mockFetchOnce({ timezone, current: {}, daily: { time: [] } }));
      const data = await getWeather(CITY);
      expect(data.forecast.map((day) => day.date)).toEqual(dates);
      expect(data.forecast.every((day) => day.maxTemperatureC === null)).toBe(true);
    });

    it('mapeia current e daily para WeatherData', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce({
          current: {
            time: '2026-06-16T12:00',
            temperature_2m: 18,
            apparent_temperature: 17,
            relative_humidity_2m: 80,
            wind_speed_10m: 10,
            precipitation: 0.2,
            surface_pressure: 1015,
            weather_code: 3,
          },
          timezone: 'America/Los_Angeles',
          daily: {
            time: ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20'],
            weather_code: [3, 61, 80, 1, 0],
            temperature_2m_max: [20, 19, 22, 24, 25],
            temperature_2m_min: [12, 11, 13, 14, 15],
            precipitation_probability_max: [0, 90, 70, 10, 0],
          },
        }),
      );

      const data = await getWeather(CITY);
      expect(data.city).toEqual(CITY);
      expect(data.current).toEqual({
        observedAt: '2026-06-16T12:00',
        weatherCode: 3,
        temperatureC: 18,
        apparentTemperatureC: 17,
        relativeHumidity: 80,
        windSpeedKmh: 10,
        precipitationMm: 0.2,
        surfacePressureHpa: 1015,
      });
      const requestUrl = new URL(vi.mocked(fetch).mock.calls[0][0].toString());
      expect(requestUrl.origin + requestUrl.pathname).toBe(
        'https://api.open-meteo.com/v1/forecast',
      );
      expect(Object.fromEntries(requestUrl.searchParams)).toMatchObject({
        latitude: String(CITY.latitude),
        longitude: String(CITY.longitude),
        temperature_unit: 'celsius',
        wind_speed_unit: 'kmh',
        timezone: 'auto',
        forecast_days: '5',
      });
      expect(requestUrl.searchParams.get('current')?.split(',')).toEqual(
        expect.arrayContaining(['precipitation', 'surface_pressure']),
      );
      expect(requestUrl.searchParams.get('precipitation_unit')).toBe('mm');
      expect(requestUrl.searchParams.get('daily')?.split(',')).toContain(
        'precipitation_probability_max',
      );
      expect(data.timezone).toBe('America/Los_Angeles');
      expect(data.forecast).toHaveLength(5);
      expect(data.forecast.map((day) => day.date)).toEqual([
        '2026-06-16',
        '2026-06-17',
        '2026-06-18',
        '2026-06-19',
        '2026-06-20',
      ]);
      expect(data.forecast[4].maxTemperatureC).toBe(25);
      expect(data.forecast[0].precipitationProbability).toBe(0);
      expect(data.forecast[1].precipitationProbability).toBe(90);
      expect(data.forecast).toEqual([
        {
          date: '2026-06-16',
          weatherCode: 3,
          minTemperatureC: 12,
          maxTemperatureC: 20,
          precipitationProbability: 0,
        },
        {
          date: '2026-06-17',
          weatherCode: 61,
          minTemperatureC: 11,
          maxTemperatureC: 19,
          precipitationProbability: 90,
        },
        {
          date: '2026-06-18',
          weatherCode: 80,
          minTemperatureC: 13,
          maxTemperatureC: 22,
          precipitationProbability: 70,
        },
        {
          date: '2026-06-19',
          weatherCode: 1,
          minTemperatureC: 14,
          maxTemperatureC: 24,
          precipitationProbability: 10,
        },
        {
          date: '2026-06-20',
          weatherCode: 0,
          minTemperatureC: 15,
          maxTemperatureC: 25,
          precipitationProbability: 0,
        },
      ]);
    });

    it.each([
      { daily: { time: [] } },
      { current: {} },
      { current: null, daily: { time: [] } },
      { current: {}, daily: null },
      { current: {}, daily: {} },
    ])('lança erro quando a resposta está incompleta: %j', async (body) => {
      vi.stubGlobal('fetch', mockFetchOnce({ timezone: 'America/Los_Angeles', ...body }));
      await expect(getWeather(CITY)).rejects.toBeInstanceOf(WeatherServiceError);
    });

    it('lança erro tipado em resposta HTTP não-ok', async () => {
      vi.stubGlobal('fetch', mockFetchOnce({}, false));
      await expect(getWeather(CITY)).rejects.toBeInstanceOf(WeatherServiceError);
    });

    it('seleciona cinco datas locais e preserva dias e métricas ausentes', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce({
          timezone: 'America/Los_Angeles',
          current: {},
          daily: {
            time: ['2026-06-15', '2026-06-16', '2026-06-18', '2026-06-20', '2026-06-21'],
            temperature_2m_max: [99, 20, 22, 24, 99],
            temperature_2m_min: [99, 0],
          },
        }),
      );

      const data = await getWeather(CITY);
      expect(data.forecast).toHaveLength(5);
      expect(data.forecast.map((day) => day.date)).toEqual([
        '2026-06-16',
        '2026-06-17',
        '2026-06-18',
        '2026-06-19',
        '2026-06-20',
      ]);
      expect(data.forecast.map((day) => day.maxTemperatureC)).toEqual([20, null, 22, null, 24]);
      expect(data.forecast[0].minTemperatureC).toBe(0);
      expect(data.forecast[1]).toEqual({
        date: '2026-06-17',
        weatherCode: null,
        minTemperatureC: null,
        maxTemperatureC: null,
        precipitationProbability: null,
      });
      expect(data.current.observedAt).toBeNull();
      expect(data.current.temperatureC).toBeNull();
    });

    it('rejeita fuso inválido com erro tipado', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce({
          timezone: 'invalid/timezone',
          current: {},
          daily: { time: [] },
        }),
      );
      await expect(getWeather(CITY)).rejects.toBeInstanceOf(WeatherServiceError);
    });

    it.each([
      [{}, null],
      [{ precipitation: null }, null],
      [{ precipitation: 0 }, 0],
    ])('preserva a distinção entre precipitação indisponível e zero: %j', async (metrics, expected) => {
      vi.stubGlobal(
        'fetch',
        mockFetchOnce({
          timezone: 'America/Los_Angeles',
          current: { temperature_2m: 18, ...metrics },
          daily: { time: ['2026-06-16'] },
        }),
      );

      const data = await getWeather(CITY);
      expect(data.current.precipitationMm).toBe(expected);
      expect(data.current.surfacePressureHpa).toBeNull();
      expect(data.forecast[0].precipitationProbability).toBeNull();
    });
  });
});
