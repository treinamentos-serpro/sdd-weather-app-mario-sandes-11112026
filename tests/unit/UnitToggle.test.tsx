import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import UnitToggle from '../../src/components/UnitToggle';
import CurrentWeather from '../../src/components/CurrentWeather';
import type { City, CurrentWeather as CurrentWeatherType, Unit } from '../../src/types/weather';

const city: City = {
  id: 1,
  name: 'Seattle',
  country: 'Estados Unidos',
  region: 'Washington',
  latitude: 47.6,
  longitude: -122.33,
};

const current: CurrentWeatherType = {
  observedAt: '2026-06-16T12:00',
  weatherCode: 3,
  temperatureC: 0,
  apparentTemperatureC: 0,
  relativeHumidity: 80,
  windSpeedKmh: 10,
  precipitationMm: 0,
  surfacePressureHpa: 1015,
};

function Harness() {
  const [unit, setUnit] = useState<Unit>('celsius');
  return (
    <>
      <UnitToggle unit={unit} onChange={setUnit} />
      <CurrentWeather city={city} current={current} unit={unit} />
    </>
  );
}

describe('UnitToggle + CurrentWeather', () => {
  it('agrupa os controles e indica a unidade selecionada', () => {
    render(<Harness />);

    expect(screen.getByRole('group', { name: 'Unidade de temperatura' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '°C' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '°F' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('converte a temperatura ao alternar a unidade', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByLabelText('Temperatura: 0° C')).toHaveTextContent('0°');

    await user.click(screen.getByRole('button', { name: '°F' }));
    expect(screen.getByLabelText('Temperatura: 32° F')).toHaveTextContent('32°');
    expect(screen.getByRole('button', { name: '°F' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '°C' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('permite alternar unidades pelo teclado', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    expect(screen.getByRole('button', { name: '°C' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.tab();
    expect(screen.getByRole('button', { name: '°F' })).toHaveFocus();
    await user.keyboard(' ');

    expect(screen.getByRole('button', { name: '°F' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Temperatura: 32° F')).toHaveTextContent('32°');
  });
});
