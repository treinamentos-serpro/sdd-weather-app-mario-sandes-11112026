import type { City, CurrentWeather, ForecastDay, WeatherData } from '../types/weather';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 10_000;

/** Erro tipado da camada de dados, com mensagem amigável ao usuário. */
export class WeatherServiceError extends Error {
  constructor(
    message: string,
    public readonly kind: 'api' | 'network' | 'timeout' | 'invalid-response' = 'api',
  ) {
    super(message);
    this.name = 'WeatherServiceError';
  }
}

/** O timeout cobre tanto os headers quanto a leitura do JSON. */
async function fetchWithTimeout(url: string, httpError: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new WeatherServiceError(httpError);
    return await response.json();
  } catch (err) {
    if (err instanceof WeatherServiceError) throw err;
    if (typeof err === 'object' && err !== null && 'name' in err && err.name === 'AbortError') {
      throw new WeatherServiceError('A requisição demorou demais.', 'timeout');
    }
    if (err instanceof SyntaxError) {
      throw new WeatherServiceError(
        'Resposta inválida do serviço. Tente novamente.',
        'invalid-response',
      );
    }
    throw new WeatherServiceError('Falha de rede.', 'network');
  } finally {
    clearTimeout(timeout);
  }
}

interface GeocodingResult {
  id: number;
  name: string;
  country?: string | null;
  admin1?: string | null;
  latitude: number;
  longitude: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isGeocodingResult(value: unknown): value is GeocodingResult {
  return (
    isRecord(value) &&
    isNumber(value.id) &&
    typeof value.name === 'string' &&
    isNumber(value.latitude) &&
    isNumber(value.longitude) &&
    (value.country == null || typeof value.country === 'string') &&
    (value.admin1 == null || typeof value.admin1 === 'string')
  );
}

/**
 * Busca cidades por nome (geocoding). Retorna lista vazia quando não há
 * resultados — o estado "vazio" é tratado pela camada de UI.
 */
export async function searchCities(name: string): Promise<City[]> {
  const query = name.trim();
  if (!query) return [];

  const url = `${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=5&language=pt&format=json`;
  const data = await fetchWithTimeout(url, 'Não foi possível buscar a cidade. Tente novamente.');
  if (!isRecord(data)) {
    throw new WeatherServiceError(
      'Resposta de cidades inválida. Tente novamente.',
      'invalid-response',
    );
  }
  if (data.results === undefined) return [];
  if (!Array.isArray(data.results) || !data.results.every(isGeocodingResult)) {
    throw new WeatherServiceError(
      'Resposta de cidades inválida. Tente novamente.',
      'invalid-response',
    );
  }

  return data.results.slice(0, 5).map((r) => ({
    id: r.id,
    name: r.name,
    country: r.country?.trim() || 'País indisponível',
    region: r.admin1?.trim() || null,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

interface ForecastResponse {
  current: {
    time?: string | null;
    temperature_2m?: number | null;
    apparent_temperature?: number | null;
    relative_humidity_2m?: number | null;
    wind_speed_10m?: number | null;
    precipitation?: number | null;
    surface_pressure?: number | null;
    weather_code?: number | null;
  };
  timezone: string;
  daily: {
    time: string[];
    weather_code?: (number | null)[] | null;
    temperature_2m_max?: (number | null)[] | null;
    temperature_2m_min?: (number | null)[] | null;
    precipitation_probability_max?: (number | null)[] | null;
  };
}

function isForecastResponse(value: unknown): value is ForecastResponse {
  if (
    !isRecord(value) ||
    !isRecord(value.current) ||
    !isRecord(value.daily) ||
    typeof value.timezone !== 'string' ||
    !value.timezone
  )
    return false;
  const current = value.current;
  const daily = value.daily;
  return (
    (current.time == null || typeof current.time === 'string') &&
    [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'wind_speed_10m',
      'precipitation',
      'surface_pressure',
      'weather_code',
    ].every((key) => current[key] == null || isNumber(current[key])) &&
    Array.isArray(daily.time) &&
    daily.time.every((date) => typeof date === 'string') &&
    [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
    ].every(
      (key) =>
        daily[key] == null ||
        (Array.isArray(daily[key]) && daily[key].every((item) => item === null || isNumber(item))),
    )
  );
}

function mapCurrent(c: NonNullable<ForecastResponse['current']>): CurrentWeather {
  return {
    observedAt: c.time?.trim() || null,
    weatherCode: c?.weather_code ?? null,
    temperatureC: c?.temperature_2m ?? null,
    apparentTemperatureC: c?.apparent_temperature ?? null,
    relativeHumidity: c?.relative_humidity_2m ?? null,
    windSpeedKmh: c?.wind_speed_10m ?? null,
    precipitationMm: c?.precipitation ?? null,
    surfacePressureHpa: c?.surface_pressure ?? null,
  };
}

function mapForecast(d: NonNullable<ForecastResponse['daily']>, timezone: string): ForecastDay[] {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
  } catch (error) {
    if (error instanceof RangeError) {
      throw new WeatherServiceError(
        'Fuso horário inválido na resposta de clima. Tente novamente.',
        'invalid-response',
      );
    }
    throw error;
  }
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const dateOfMonth = Number(parts.find((part) => part.type === 'day')?.value);
  const today = new Date(Date.UTC(year, month - 1, dateOfMonth));

  return Array.from({ length: 5 }, (_, offset) => {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() + offset);
    const date = day.toISOString().slice(0, 10);
    const i = d.time.indexOf(date);
    return {
      date,
      weatherCode: d.weather_code?.[i] ?? null,
      maxTemperatureC: d.temperature_2m_max?.[i] ?? null,
      minTemperatureC: d.temperature_2m_min?.[i] ?? null,
      precipitationProbability: d.precipitation_probability_max?.[i] ?? null,
    };
  });
}

/**
 * Busca o clima atual e a previsão de 5 dias para uma cidade.
 * Temperaturas retornam em Celsius (conversão fica na UI).
 */
export async function getWeather(city: City): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current:
      'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation,surface_pressure',
    daily: 'weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
    forecast_days: '5',
    timezone: 'auto',
  });

  const data = await fetchWithTimeout(
    `${FORECAST_URL}?${params.toString()}`,
    'Não foi possível carregar o clima. Tente novamente.',
  );
  if (!isForecastResponse(data)) {
    throw new WeatherServiceError(
      'Resposta de clima incompleta. Tente novamente.',
      'invalid-response',
    );
  }

  return {
    city,
    timezone: data.timezone,
    current: mapCurrent(data.current),
    forecast: mapForecast(data.daily, data.timezone),
  };
}
