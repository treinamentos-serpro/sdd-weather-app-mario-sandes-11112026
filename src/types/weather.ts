/**
 * Contratos de domínio compartilhados do Weather App.
 *
 * Decisão de arquitetura: as temperaturas são sempre armazenadas em Celsius
 * internamente e convertidas apenas na camada de apresentação. Assim, a troca
 * de unidade (C/F) nunca dispara um novo request.
 */

export type Unit = 'celsius' | 'fahrenheit';

/** Localidade escolhida pelo usuário e usada nas consultas meteorológicas. */
export interface City {
  /** Identificador da cidade no serviço de geocoding. */
  id: number;
  /** Nome localizado da cidade. */
  name: string;
  /** País onde a cidade está localizada. */
  country: string;
  /** Região administrativa, quando disponível no geocoding. */
  region: string | null;
  /** Latitude usada para consultar a previsão. */
  latitude: number;
  /** Longitude usada para consultar a previsão. */
  longitude: number;
}

/** Condições atuais. Temperaturas em °C e vento em km/h. */
export interface CurrentWeather {
  /** Horário local da observação, ou null quando ausente. */
  observedAt: string | null;
  /** Código WMO da condição atual, ou null quando ausente. */
  weatherCode: number | null;
  /** Temperatura atual em Celsius, ou null quando ausente. */
  temperatureC: number | null;
  /** Sensação térmica em Celsius, ou null quando ausente. */
  apparentTemperatureC: number | null;
  /** Umidade relativa em porcentagem, ou null quando ausente. */
  relativeHumidity: number | null;
  /** Velocidade do vento em km/h, ou null quando ausente. */
  windSpeedKmh: number | null;
  /** Precipitação do intervalo atual em mm, ou null quando ausente. */
  precipitationMm: number | null;
  /** Pressão à superfície em hPa, ou null quando ausente. */
  surfacePressureHpa: number | null;
}

/** Previsão diária local. Temperaturas em °C. */
export interface ForecastDay {
  /** Data local no formato YYYY-MM-DD. */
  date: string;
  /** Código WMO da condição do dia, ou null quando ausente. */
  weatherCode: number | null;
  /** Temperatura mínima em Celsius, ou null quando ausente. */
  minTemperatureC: number | null;
  /** Temperatura máxima em Celsius, ou null quando ausente. */
  maxTemperatureC: number | null;
  /** Probabilidade máxima diária de precipitação em %, ou null quando ausente. */
  precipitationProbability: number | null;
}

/** Cidade, fuso, condições atuais e cinco posições da previsão diária. */
export interface WeatherData {
  /** Cidade selecionada para a consulta. */
  city: City;
  /** Identificador de fuso horário IANA retornado pela API. */
  timezone: string;
  /** Condições meteorológicas atuais. */
  current: CurrentWeather;
  /** Previsões diárias locais. */
  forecast: ForecastDay[];
}
