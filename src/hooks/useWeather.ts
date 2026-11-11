import { useCallback, useEffect, useRef, useState } from 'react';
import { getWeather, searchCities, WeatherServiceError } from '../services/weatherService';
import type { City, WeatherData } from '../types/weather';

export type WeatherStatus = 'idle' | 'loading' | 'results' | 'success' | 'error' | 'empty';

interface UseWeatherResult {
  status: WeatherStatus;
  data: WeatherData | null;
  cities: City[];
  error: string | null;
  query: string;
  search: (name: string) => Promise<void>;
  selectCity: (city: City) => Promise<void>;
  retry: () => Promise<void>;
}

type WeatherOperation = { type: 'search'; name: string } | { type: 'forecast'; city: City };

/**
 * Hook de orquestração: busca cidades, seleciona uma e carrega o clima.
 * Expõe uma máquina de estados simples (idle/loading/success/error/empty).
 */
export function useWeather(): UseWeatherResult {
  const [status, setStatus] = useState<WeatherStatus>('idle');
  const [data, setData] = useState<WeatherData | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const lastOperation = useRef<WeatherOperation | null>(null);
  const requestId = useRef(0);

  useEffect(
    () => () => {
      requestId.current += 1;
    },
    [],
  );

  const loadWeather = useCallback(async (city: City, id: number) => {
    lastOperation.current = { type: 'forecast', city };
    try {
      const weather = await getWeather(city);
      if (id !== requestId.current) return;
      setData(weather);
      setStatus('success');
    } catch (err) {
      if (id !== requestId.current) return;
      setStatus('error');
      setError(toMessage(err));
    }
  }, []);

  const search = useCallback(async (name: string) => {
    const trimmed = name.trim();
    const id = ++requestId.current;
    setQuery(trimmed);
    setData(null);
    setError(null);
    setCities([]);
    lastOperation.current = trimmed ? { type: 'search', name: trimmed } : null;
    if (!trimmed) {
      setStatus('empty');
      return;
    }

    setStatus('loading');
    try {
      const results = await searchCities(trimmed);
      if (id !== requestId.current) return;
      if (results.length === 0) {
        setStatus('empty');
        return;
      }
      setCities(results);
      setStatus('results');
    } catch (err) {
      if (id !== requestId.current) return;
      setStatus('error');
      setError(toMessage(err));
    }
  }, []);

  const selectCity = useCallback(
    async (city: City) => {
      const id = ++requestId.current;
      lastOperation.current = { type: 'forecast', city };
      setStatus('loading');
      setData(null);
      setError(null);
      await loadWeather(city, id);
    },
    [loadWeather],
  );

  const retry = useCallback(async () => {
    const operation = lastOperation.current;
    if (operation?.type === 'forecast') {
      await selectCity(operation.city);
    } else if (operation?.type === 'search') {
      await search(operation.name);
    }
  }, [selectCity, search]);

  return { status, data, cities, error, query, search, selectCity, retry };
}

function toMessage(err: unknown): string {
  if (err instanceof WeatherServiceError && err.kind === 'timeout') {
    return 'A solicitação expirou. Tente novamente.';
  }
  return 'Não foi possível carregar os dados. Tente novamente.';
}
