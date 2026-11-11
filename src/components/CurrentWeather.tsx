import type { CurrentWeather as CurrentWeatherType, City, Unit } from '../types/weather';
import { formatTemperature, unitLabel } from '../lib/temperature';
import { getWeatherIcon, getWeatherLabel } from '../lib/weatherCodes';

interface CurrentWeatherProps {
  city: City;
  current: CurrentWeatherType;
  unit: Unit;
}

interface MetricProps {
  icon: string;
  label: string;
  value: string;
}

function Metric({ icon, label, value }: MetricProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md">
      <dt className="flex items-center gap-2 text-xs text-white/70">
        <span aria-hidden="true" className="text-xl">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

/** Seção "hero" com as condições atuais da cidade selecionada. */
export default function CurrentWeather({ city, current, unit }: CurrentWeatherProps) {
  const location = [city.region, city.country].filter(Boolean).join(', ') || 'Localidade indisponível';
  const observedTime = current.observedAt?.slice(11, 16);

  return (
    <section
      aria-label="Clima atual"
      className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-glass md:p-8"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2 className="break-words text-2xl font-bold md:text-3xl">{city.name}</h2>
          <p className="break-words text-white/70">{location}</p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <span aria-hidden="true" className="text-6xl">
              {getWeatherIcon(current.weatherCode)}
            </span>
            <output
              aria-label={
                current.temperatureC === null
                  ? 'Temperatura indisponível'
                  : `Temperatura: ${formatTemperature(current.temperatureC, unit)} ${unitLabel(unit).slice(1)}`
              }
              className={
                current.temperatureC === null
                  ? 'text-2xl font-light'
                  : 'text-6xl font-light md:text-7xl'
              }
            >
              {current.temperatureC === null
                ? 'Indisponível'
                : formatTemperature(current.temperatureC, unit)}
            </output>
          </div>
          <p className="mt-2 text-white/70">{getWeatherLabel(current.weatherCode)}</p>
          <p className="mt-1 text-sm text-white/70">
            Sensação térmica:{' '}
            {current.apparentTemperatureC === null
              ? 'Indisponível'
              : formatTemperature(current.apparentTemperatureC, unit)}
          </p>
          <p className="mt-1 text-sm text-white/70">
            {observedTime
              ? `Horário de referência: ${observedTime}`
              : 'Horário de referência indisponível'}
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Metric
            icon="💧"
            label="Umidade"
            value={
              current.relativeHumidity === null
                ? 'Indisponível'
                : `${Math.round(current.relativeHumidity)}%`
            }
          />
          <Metric
            icon="💨"
            label="Vento"
            value={
              current.windSpeedKmh === null
                ? 'Indisponível'
                : `${Math.round(current.windSpeedKmh)} km/h`
            }
          />
          <Metric
            icon="🌧️"
            label="Precipitação"
            value={
              current.precipitationMm === null
                ? 'Indisponível'
                : `${current.precipitationMm} mm`
            }
          />
          <Metric
            icon="🌡️"
            label="Pressão"
            value={
              current.surfacePressureHpa === null
                ? 'Indisponível'
                : `${Math.round(current.surfacePressureHpa)} hPa`
            }
          />
        </dl>
      </div>
    </section>
  );
}
