import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ForecastList from '../../src/components/ForecastList';
import { mockWeatherData } from '../../src/mocks/weatherMock';
import type { ForecastDay } from '../../src/types/weather';

describe('ForecastList', () => {
  it('exibe cinco cards com rótulos, ícones, temperaturas e chance de chuva', () => {
    render(<ForecastList forecast={mockWeatherData.forecast} unit="celsius" />);

    const region = within(screen.getByRole('region', { name: 'Previsão de 5 dias' }));
    const cards = region.getAllByRole('listitem');
    expect(cards).toHaveLength(5);
    expect(within(cards[0]).getByText('Hoje')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Amanhã')).toBeInTheDocument();
    expect(within(cards[2]).getByText('Sex')).toBeInTheDocument();
    const first = within(cards[0]);
    expect(first.getByText('11 Nov')).toBeInTheDocument();
    expect(first.getByText('⛅')).toHaveAttribute('aria-hidden', 'true');
    expect(first.getByText('Parcialmente nublado')).toBeInTheDocument();
    expect(first.getByText('Máx: 26°')).toBeInTheDocument();
    expect(first.getByText('Mín: 17°')).toBeInTheDocument();
    expect(first.getByText('Chuva: 0%')).toBeInTheDocument();
    expect(within(cards[2]).getByText('Chuva: 80%')).toBeInTheDocument();
  });

  it('converte máxima e mínima ao mudar a unidade sem alterar a chance de chuva', () => {
    const forecast: ForecastDay[] = [{
      date: '2026-11-11',
      weatherCode: 0,
      minTemperatureC: 0,
      maxTemperatureC: 20,
      precipitationProbability: 50,
    }];
    const { rerender } = render(<ForecastList forecast={forecast} unit="celsius" />);
    expect(screen.getByText('Máx: 20°')).toBeInTheDocument();
    expect(screen.getByText('Mín: 0°')).toBeInTheDocument();

    rerender(<ForecastList forecast={forecast} unit="fahrenheit" />);
    expect(screen.getByText('Máx: 68°')).toBeInTheDocument();
    expect(screen.getByText('Mín: 32°')).toBeInTheDocument();
    expect(screen.getByText('Chuva: 50%')).toBeInTheDocument();
    expect(forecast[0].minTemperatureC).toBe(0);
  });

  it.each(['celsius', 'fahrenheit'] as const)('mantém o dia e indica métricas ausentes em %s', (unit) => {
    render(<ForecastList forecast={[{
      date: '2026-11-11',
      weatherCode: null,
      minTemperatureC: null,
      maxTemperatureC: null,
      precipitationProbability: null,
    }]} unit={unit} />);

    expect(screen.getByText('Hoje')).toBeInTheDocument();
    expect(screen.getByText('11 Nov')).toBeInTheDocument();
    expect(screen.getByText('Máx: Indisponível')).toBeInTheDocument();
    expect(screen.getByText('Mín: Indisponível')).toBeInTheDocument();
    expect(screen.getByText('Chuva: Indisponível')).toBeInTheDocument();
    expect(screen.getByText('Previsão indisponível')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Previsão de 5 dias' })).not.toHaveTextContent(
      /NaN|undefined|Infinity/,
    );
  });

  it('comunica a ausência de previsão', () => {
    render(<ForecastList forecast={[]} unit="celsius" />);
    expect(screen.getByText('Previsão indisponível')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
