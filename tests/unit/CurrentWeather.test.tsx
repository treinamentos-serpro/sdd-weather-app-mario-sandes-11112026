import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CurrentWeather from '../../src/components/CurrentWeather';
import { mockWeatherData } from '../../src/mocks/weatherMock';
import type { CurrentWeather as CurrentWeatherType } from '../../src/types/weather';

const { city, current } = mockWeatherData;

describe('CurrentWeather', () => {
  it('exibe cidade, condição, ícone e as quatro métricas com unidades', () => {
    render(<CurrentWeather city={city} current={current} unit="celsius" />);

    const hero = within(screen.getByRole('region', { name: 'Clima atual' }));
    expect(hero.getByRole('heading', { name: 'São Paulo' })).toBeInTheDocument();
    expect(hero.getByText('São Paulo, Brasil')).toBeInTheDocument();
    expect(hero.getByLabelText('Temperatura: 23° C')).toHaveTextContent('23°');
    expect(hero.getByText('⛅')).toHaveAttribute('aria-hidden', 'true');
    expect(hero.getByText('Parcialmente nublado')).toBeInTheDocument();
    expect(hero.getByText(/Sensação térmica:/)).toHaveTextContent('24°');
    expect(hero.getByText('Horário de referência: 15:00')).toBeInTheDocument();
    const metrics = hero.getAllByRole('term');
    expect(metrics).toHaveLength(4);
    for (const label of ['Umidade', 'Vento', 'Precipitação', 'Pressão']) {
      expect(hero.getByText(label)).toBeInTheDocument();
    }
    expect(hero.getAllByRole('definition').map((metric) => metric.textContent)).toEqual([
      '64%', '12 km/h', '0 mm', '1015 hPa',
    ]);
  });

  it('deriva Fahrenheit das props sem alterar os dados originais', () => {
    const { rerender } = render(
      <CurrentWeather city={city} current={current} unit="celsius" />,
    );
    rerender(<CurrentWeather city={city} current={current} unit="fahrenheit" />);

    expect(screen.getByLabelText('Temperatura: 73° F')).toHaveTextContent('73°');
    expect(screen.getByText(/Sensação térmica:/)).toHaveTextContent('75°');
    expect(screen.getByText('0 mm')).toBeInTheDocument();
    expect(screen.getByText('1015 hPa')).toBeInTheDocument();
    expect(current.temperatureC).toBe(23);
  });

  it.each(['celsius', 'fahrenheit'] as const)('indica campos ausentes sem inventar métricas nem horário em %s', (unit) => {
    const missing: CurrentWeatherType = {
      observedAt: null,
      weatherCode: null,
      temperatureC: null,
      apparentTemperatureC: null,
      relativeHumidity: null,
      windSpeedKmh: null,
      precipitationMm: null,
      surfacePressureHpa: null,
    };
    render(<CurrentWeather city={{ ...city, region: null, country: '' }} current={missing} unit={unit} />);

    expect(screen.getByLabelText('Temperatura indisponível')).toHaveTextContent('Indisponível');
    expect(screen.getAllByRole('definition')).toHaveLength(4);
    for (const metric of screen.getAllByRole('definition')) {
      expect(metric).toHaveTextContent('Indisponível');
    }
    expect(screen.getByText('Condição desconhecida')).toBeInTheDocument();
    expect(screen.getByText('Horário de referência indisponível')).toBeInTheDocument();
    expect(screen.getByText('Localidade indisponível')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Clima atual' })).not.toHaveTextContent(
      /NaN|undefined|Infinity/,
    );
  });

  it('preserva métricas zero e precipitação fracionária', () => {
    render(
      <CurrentWeather
        city={city}
        current={{ ...current, relativeHumidity: 0, windSpeedKmh: 0, precipitationMm: 0.2 }}
        unit="celsius"
      />,
    );

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0 km/h')).toBeInTheDocument();
    expect(screen.getByText('0.2 mm')).toBeInTheDocument();
  });
});
