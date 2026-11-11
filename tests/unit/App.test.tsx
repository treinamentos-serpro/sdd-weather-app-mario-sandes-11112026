import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { mockWeatherData } from '../../src/mocks/weatherMock';
import { getWeather, searchCities, WeatherServiceError } from '../../src/services/weatherService';

vi.mock('../../src/services/weatherService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/services/weatherService')>();
  return { ...original, searchCities: vi.fn(), getWeather: vi.fn() };
});

describe('App', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(searchCities).mockResolvedValue([mockWeatherData.city]);
    vi.mocked(getWeather).mockResolvedValue(mockWeatherData);
  });

  it('renderiza header, estado inicial e unidade Celsius sem buscar dados', () => {
    render(<App />);
    expect(screen.getByText('WeatherView')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Previsão do tempo' })).toBeInTheDocument();
    expect(screen.getByText('Busque uma cidade para começar')).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar cidade')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Unidade de temperatura' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '°C' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText(/demonstração/i)).not.toBeInTheDocument();
    expect(searchCities).not.toHaveBeenCalled();
    expect(getWeather).not.toHaveBeenCalled();
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByRole('main')).not.toHaveFocus();
  });

  it('mostra loading durante geocoding e forecast, seguido de sucesso', async () => {
    const user = userEvent.setup();
    let resolveCities!: (cities: (typeof mockWeatherData.city)[]) => void;
    let resolveWeather!: (data: typeof mockWeatherData) => void;
    vi.mocked(searchCities).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCities = resolve;
      }),
    );
    vi.mocked(getWeather).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveWeather = resolve;
      }),
    );
    render(<App />);
    await user.type(screen.getByLabelText('Buscar cidade'), '  São Paulo  {Enter}');
    expect(screen.getByRole('status', { name: 'Carregando o clima' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByLabelText('Buscar cidade')).toBeDisabled();
    expect(screen.queryByRole('region', { name: 'Clima atual' })).not.toBeInTheDocument();

    await act(async () => {
      resolveCities([mockWeatherData.city]);
    });
    expect(screen.getByRole('region', { name: 'Resultados da busca' })).toBeInTheDocument();
    expect(getWeather).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /São Paulo/ }));
    expect(getWeather).toHaveBeenCalledWith(mockWeatherData.city);
    expect(screen.getByRole('status', { name: 'Carregando o clima' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
    await act(async () => {
      resolveWeather(mockWeatherData);
    });
    expect(await screen.findByRole('heading', { name: 'São Paulo' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByLabelText('Buscar cidade')).toBeEnabled();
    expect(searchCities).toHaveBeenCalledWith('São Paulo');
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('preserva foco movido para unidade durante loading e após converter', async () => {
    const user = userEvent.setup();
    let resolveWeather!: (data: typeof mockWeatherData) => void;
    vi.mocked(getWeather).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveWeather = resolve;
      }),
    );
    render(<App />);
    await user.type(screen.getByLabelText('Buscar cidade'), 'São Paulo{Enter}');
    await user.click(await screen.findByRole('button', { name: /São Paulo/ }));
    const fahrenheit = screen.getByRole('button', { name: '°F' });
    await user.click(fahrenheit);
    await act(async () => {
      resolveWeather(mockWeatherData);
    });
    expect(screen.getByLabelText('Temperatura: 73° F')).toBeInTheDocument();
    expect(fahrenheit).toHaveFocus();
    const celsius = screen.getByRole('button', { name: '°C' });
    await user.click(celsius);
    expect(celsius).toHaveFocus();
    expect(screen.getByLabelText('Temperatura: 23° C')).toBeInTheDocument();
  });

  it('troca unidade na renderização sem novas consultas nem mutação dos dados', async () => {
    const user = userEvent.setup();
    const original = structuredClone(mockWeatherData);
    const { unmount } = render(<App />);
    await user.type(screen.getByLabelText('Buscar cidade'), 'São Paulo{Enter}');
    await user.click(await screen.findByRole('button', { name: /São Paulo/ }));
    expect(await screen.findByLabelText('Temperatura: 23° C')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '°F' }));
    expect(screen.getByLabelText('Temperatura: 73° F')).toBeInTheDocument();
    const firstCard = within(screen.getAllByRole('listitem')[0]);
    expect(firstCard.getByText('Máx: 79°')).toBeInTheDocument();
    expect(firstCard.getByText('Mín: 63°')).toBeInTheDocument();
    expect(searchCities).toHaveBeenCalledTimes(1);
    expect(getWeather).toHaveBeenCalledTimes(1);
    expect(mockWeatherData).toEqual(original);
    unmount();
    render(<App />);
    expect(screen.getByRole('button', { name: '°C' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('exibe empty sem forecast e conserva o termo pesquisado', async () => {
    const user = userEvent.setup();
    vi.mocked(searchCities).mockResolvedValueOnce([]);
    render(<App />);
    await user.type(screen.getByLabelText('Buscar cidade'), 'Lisboa{Enter}');
    expect(await screen.findByText('Nenhuma cidade encontrada.')).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar cidade')).toHaveValue('Lisboa');
    expect(getWeather).not.toHaveBeenCalled();
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'false');
  });

  it.each([
    'geocoding',
    'forecast',
  ])('exibe erro de %s e retry recupera os dados', async (stage) => {
    const user = userEvent.setup();
    const failure = new WeatherServiceError('Falha de rede.');
    if (stage === 'geocoding') vi.mocked(searchCities).mockRejectedValueOnce(failure);
    else vi.mocked(getWeather).mockRejectedValueOnce(failure);
    render(<App />);
    await user.type(screen.getByLabelText('Buscar cidade'), 'São Paulo{Enter}');
    if (stage === 'forecast') {
      await user.click(await screen.findByRole('button', { name: /São Paulo/ }));
    }
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os dados. Tente novamente.',
    );
    expect(screen.queryByRole('region', { name: 'Clima atual' })).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'false');
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    if (stage === 'geocoding') {
      await user.click(await screen.findByRole('button', { name: /São Paulo/ }));
    }
    expect(await screen.findByRole('heading', { name: 'São Paulo' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
    expect(searchCities).toHaveBeenCalledTimes(stage === 'geocoding' ? 2 : 1);
    expect(getWeather).toHaveBeenCalledTimes(stage === 'forecast' ? 2 : 1);
  });

  it('exibe timeout da consulta meteorológica e permite nova tentativa', async () => {
    const user = userEvent.setup();
    vi.mocked(getWeather).mockRejectedValueOnce(
      new WeatherServiceError('A requisição demorou demais.', 'timeout'),
    );
    render(<App />);
    await user.type(screen.getByLabelText('Buscar cidade'), 'São Paulo{Enter}');
    await user.click(await screen.findByRole('button', { name: /São Paulo/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A solicitação expirou. Tente novamente.',
    );
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: 'São Paulo' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('limpa o clima anterior ao pesquisar outra cidade e preserva a unidade', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Buscar cidade'), 'São Paulo{Enter}');
    await user.click(await screen.findByRole('button', { name: /São Paulo/ }));
    await screen.findByRole('heading', { name: 'São Paulo' });
    await user.click(screen.getByRole('button', { name: '°F' }));
    vi.mocked(searchCities).mockResolvedValueOnce([]);
    await user.clear(screen.getByLabelText('Buscar cidade'));
    await user.type(screen.getByLabelText('Buscar cidade'), 'Outra{Enter}');
    await screen.findByText('Nenhuma cidade encontrada.');
    expect(screen.queryByRole('region', { name: 'Clima atual' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '°F' })).toHaveAttribute('aria-pressed', 'true');
  });
});
