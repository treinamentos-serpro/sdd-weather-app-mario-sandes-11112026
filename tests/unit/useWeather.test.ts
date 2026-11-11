import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWeather } from '../../src/hooks/useWeather';
import { mockWeatherData } from '../../src/mocks/weatherMock';
import { getWeather, searchCities, WeatherServiceError } from '../../src/services/weatherService';
import type { City, WeatherData } from '../../src/types/weather';

vi.mock('../../src/services/weatherService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/services/weatherService')>();
  return { ...original, searchCities: vi.fn(), getWeather: vi.fn() };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const city = mockWeatherData.city;
const otherCity: City = { ...city, id: 2, name: 'Lisboa', country: 'Portugal' };
const otherWeather: WeatherData = { ...mockWeatherData, city: otherCity };

describe('useWeather', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(searchCities).mockResolvedValue([city, otherCity]);
    vi.mocked(getWeather).mockResolvedValue(mockWeatherData);
  });

  it('inicia em idle sem consultar serviços; retry inicial não faz chamadas', async () => {
    const { result } = renderHook(() => useWeather());
    expect(result.current).toMatchObject({
      status: 'idle',
      data: null,
      cities: [],
      error: null,
      query: '',
    });
    await act(() => result.current.retry());
    expect(searchCities).not.toHaveBeenCalled();
    expect(getWeather).not.toHaveBeenCalled();
  });

  it.each(['', ' \t '])('entrada %j resulta em empty sem rede', async (name) => {
    const { result } = renderHook(() => useWeather());
    await act(() => result.current.search(name));
    expect(result.current).toMatchObject({
      status: 'empty',
      data: null,
      cities: [],
      error: null,
      query: '',
    });
    expect(searchCities).not.toHaveBeenCalled();
    expect(getWeather).not.toHaveBeenCalled();
  });

  it('normaliza o termo e expõe os resultados para seleção sem carregar forecast', async () => {
    const pending = deferred<City[]>();
    vi.mocked(searchCities).mockReturnValueOnce(pending.promise);
    const { result } = renderHook(() => useWeather());
    let operation!: Promise<void>;
    act(() => {
      operation = result.current.search('  São Paulo  ');
    });
    expect(result.current.status).toBe('loading');
    expect(result.current.query).toBe('São Paulo');
    await act(async () => {
      pending.resolve([city, otherCity]);
      await operation;
    });
    expect(searchCities).toHaveBeenCalledWith('São Paulo');
    expect(getWeather).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({
      status: 'results',
      cities: [city, otherCity],
      data: null,
      error: null,
    });
  });

  it('carrega o forecast apenas para a cidade selecionada', async () => {
    const { result } = renderHook(() => useWeather());
    await act(() => result.current.search(city.name));
    expect(result.current.status).toBe('results');
    expect(getWeather).not.toHaveBeenCalled();

    vi.mocked(getWeather).mockResolvedValueOnce(otherWeather);
    await act(() => result.current.selectCity(otherCity));

    expect(getWeather).toHaveBeenCalledExactlyOnceWith(otherCity);
    expect(result.current).toMatchObject({ status: 'success', data: otherWeather });
  });

  it('não consulta forecast quando geocoding retorna vazio', async () => {
    vi.mocked(searchCities).mockResolvedValueOnce([]);
    const { result } = renderHook(() => useWeather());
    await act(() => result.current.search('inexistente'));
    expect(result.current.status).toBe('empty');
    expect(result.current.data).toBeNull();
    expect(getWeather).not.toHaveBeenCalled();
  });

  it('seleciona outra cidade e limpa os dados durante loading', async () => {
    const { result } = renderHook(() => useWeather());
    await act(() => result.current.search(city.name));
    const pending = deferred<WeatherData>();
    vi.mocked(getWeather).mockReturnValueOnce(pending.promise);
    let operation!: Promise<void>;
    act(() => {
      operation = result.current.selectCity(otherCity);
    });
    expect(result.current).toMatchObject({ status: 'loading', data: null, error: null });
    await act(async () => {
      pending.resolve(otherWeather);
      await operation;
    });
    expect(getWeather).toHaveBeenLastCalledWith(otherCity);
    expect(result.current.data).toEqual(otherWeather);
  });

  it('retry repete geocoding que falhou, sem reutilizar a cidade anterior', async () => {
    const { result } = renderHook(() => useWeather());
    await act(() => result.current.search(city.name));
    vi.mocked(searchCities).mockRejectedValueOnce(new WeatherServiceError('Falha de rede.'));
    await act(() => result.current.search('Lisboa'));
    expect(result.current).toMatchObject({
      status: 'error',
      error: 'Não foi possível carregar os dados. Tente novamente.',
      data: null,
    });
    vi.mocked(searchCities).mockResolvedValueOnce([otherCity]);
    await act(() => result.current.retry());
    expect(searchCities).toHaveBeenLastCalledWith('Lisboa');
    expect(getWeather).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({
      status: 'results',
      cities: [otherCity],
      data: null,
      error: null,
    });
  });

  it('retry repete apenas o forecast que falhou', async () => {
    vi.mocked(getWeather).mockRejectedValueOnce(
      new WeatherServiceError('A requisição demorou demais.', 'timeout'),
    );
    const { result } = renderHook(() => useWeather());
    await act(() => result.current.search(city.name));
    await act(() => result.current.selectCity(city));
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('A solicitação expirou. Tente novamente.');
    await act(() => result.current.retry());
    expect(searchCities).toHaveBeenCalledTimes(1);
    expect(getWeather).toHaveBeenCalledTimes(2);
    expect(getWeather).toHaveBeenLastCalledWith(city);
    expect(result.current).toMatchObject({ status: 'success', error: null });
  });

  it('exibe mensagem de erro para falha inesperada', async () => {
    vi.mocked(searchCities).mockRejectedValueOnce(new Error('Unexpected'));
    const { result } = renderHook(() => useWeather());
    await act(() => result.current.search(city.name));
    expect(result.current).toMatchObject({
      status: 'error',
      error: 'Não foi possível carregar os dados. Tente novamente.',
    });
  });

  it('mantém sucesso com resposta parcial sem converter null em zero', async () => {
    const partial: WeatherData = {
      ...mockWeatherData,
      current: { ...mockWeatherData.current, temperatureC: null, observedAt: null },
      forecast: mockWeatherData.forecast.map((day) => ({
        ...day,
        minTemperatureC: null,
        maxTemperatureC: null,
      })),
    };
    vi.mocked(getWeather).mockResolvedValueOnce(partial);
    const { result } = renderHook(() => useWeather());
    await act(() => result.current.search(city.name));
    await act(() => result.current.selectCity(city));
    expect(result.current).toMatchObject({ status: 'success', data: partial, error: null });
  });

  it('erro de geocoding tardio não substitui nova seleção nem sua operação de retry', async () => {
    const pending = deferred<City[]>();
    vi.mocked(searchCities).mockReturnValueOnce(pending.promise);
    const { result } = renderHook(() => useWeather());
    let oldOperation!: Promise<void>;
    act(() => {
      oldOperation = result.current.search('anterior');
    });
    vi.mocked(getWeather).mockResolvedValue(otherWeather);
    await act(() => result.current.selectCity(otherCity));
    await act(async () => {
      pending.reject(new WeatherServiceError('Falha de rede.'));
      await oldOperation;
    });
    expect(result.current).toMatchObject({ status: 'success', data: otherWeather, error: null });
    await act(() => result.current.retry());
    expect(getWeather).toHaveBeenLastCalledWith(otherCity);
    expect(searchCities).toHaveBeenCalledTimes(1);
  });

  it('ignora geocoding obsoleto sem iniciar seu forecast', async () => {
    const pending = deferred<City[]>();
    vi.mocked(searchCities).mockReturnValueOnce(pending.promise);
    const { result } = renderHook(() => useWeather());
    let oldOperation!: Promise<void>;
    act(() => {
      oldOperation = result.current.search('anterior');
    });
    await act(() => result.current.search('atual'));
    await act(async () => {
      pending.resolve([otherCity]);
      await oldOperation;
    });
    expect(result.current.query).toBe('atual');
    expect(result.current).toMatchObject({
      status: 'results',
      cities: [city, otherCity],
      data: null,
    });
    expect(getWeather).not.toHaveBeenCalled();
  });

  it.each(['success', 'error'])('ignora forecast obsoleto que termina em %s', async (outcome) => {
    const pending = deferred<WeatherData>();
    vi.mocked(getWeather).mockReturnValueOnce(pending.promise);
    const { result } = renderHook(() => useWeather());
    let oldOperation!: Promise<void>;
    act(() => {
      oldOperation = result.current.selectCity(city);
    });
    vi.mocked(getWeather).mockResolvedValueOnce(otherWeather);
    await act(() => result.current.selectCity(otherCity));
    await act(async () => {
      if (outcome === 'success') pending.resolve(mockWeatherData);
      else pending.reject(new WeatherServiceError('Falha de rede.'));
      await oldOperation;
    });
    expect(result.current).toMatchObject({ status: 'success', data: otherWeather, error: null });
  });

  it('entrada vazia invalida busca pendente e limpa os resultados anteriores', async () => {
    const pending = deferred<City[]>();
    vi.mocked(searchCities).mockReturnValueOnce(pending.promise);
    const { result } = renderHook(() => useWeather());
    let operation!: Promise<void>;
    act(() => {
      operation = result.current.search(city.name);
    });
    await act(() => result.current.search(' '));
    await act(async () => {
      pending.resolve([city]);
      await operation;
    });
    expect(result.current).toMatchObject({ status: 'empty', data: null, cities: [], query: '' });
    expect(getWeather).not.toHaveBeenCalled();
  });

  it('não inicia forecast se geocoding termina após desmontagem', async () => {
    const pending = deferred<City[]>();
    vi.mocked(searchCities).mockReturnValueOnce(pending.promise);
    const { result, unmount } = renderHook(() => useWeather());
    let operation!: Promise<void>;
    act(() => {
      operation = result.current.search(city.name);
    });
    unmount();
    await act(async () => {
      pending.resolve([city]);
      await operation;
    });
    expect(getWeather).not.toHaveBeenCalled();
  });
});
