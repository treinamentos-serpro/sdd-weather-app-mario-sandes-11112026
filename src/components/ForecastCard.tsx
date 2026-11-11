import type { ForecastDay, Unit } from '../types/weather';
import { formatTemperature } from '../lib/temperature';
import { getWeatherIcon, getWeatherLabel } from '../lib/weatherCodes';
import { getDayLabel, getShortDate } from '../lib/format';

interface ForecastCardProps {
  day: ForecastDay;
  index: number;
  unit: Unit;
}

/** Card de um dia da previsão. */
export default function ForecastCard({ day, index, unit }: ForecastCardProps) {
  const unavailable = day.weatherCode === null &&
    day.minTemperatureC === null && day.maxTemperatureC === null &&
    day.precipitationProbability === null;
  return (
    <li className="flex min-w-0 flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-md">
      <p className="font-semibold">{getDayLabel(day.date, index)}</p>
      <p className="text-xs text-white/70">{getShortDate(day.date)}</p>
      <span aria-hidden="true" className="text-3xl" title={getWeatherLabel(day.weatherCode)}>
        {getWeatherIcon(day.weatherCode)}
      </span>
      <p className="max-w-full break-words text-xs text-white/70">
        {unavailable ? 'Previsão indisponível' : getWeatherLabel(day.weatherCode)}
      </p>
      <p className="flex flex-wrap justify-center gap-x-2 text-sm">
        <span className="font-semibold">
          Máx:{' '}
          {day.maxTemperatureC === null
            ? 'Indisponível'
            : formatTemperature(day.maxTemperatureC, unit)}
        </span>{' '}
        <span className="text-white/70">
          Mín:{' '}
          {day.minTemperatureC === null
            ? 'Indisponível'
            : formatTemperature(day.minTemperatureC, unit)}
        </span>
      </p>
      <p className="text-xs text-white/70">
        Chuva:{' '}
        {day.precipitationProbability === null
          ? 'Indisponível'
          : `${Math.round(day.precipitationProbability)}%`}
      </p>
    </li>
  );
}
