import { useEffect, useRef, useState } from 'react';
import CityResults from './components/CityResults';
import CurrentWeather from './components/CurrentWeather';
import ForecastList from './components/ForecastList';
import SearchBar from './components/SearchBar';
import EmptyState from './components/states/EmptyState';
import ErrorState from './components/states/ErrorState';
import LoadingState from './components/states/LoadingState';
import UnitToggle from './components/UnitToggle';
import { useWeather } from './hooks/useWeather';
import type { Unit } from './types/weather';

export default function App() {
  const { status, data, cities, error, search, selectCity, retry } = useWeather();
  const [unit, setUnit] = useState<Unit>('celsius');
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (status !== 'success') return;
    const activeElement = document.activeElement;
    if (
      activeElement === document.body ||
      activeElement?.closest('[role="search"]') ||
      mainRef.current?.contains(activeElement)
    ) {
      mainRef.current?.focus();
    }
  }, [status]);

  return (
    <div className="min-h-screen bg-night-900 text-white">
      <a
        href="#main-content"
        className="sr-only z-10 rounded-lg bg-night-900 p-3 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:outline focus:outline-2 focus:outline-accent-400"
      >
        Pular para o conteúdo
      </a>
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-2xl text-sun">
              ☀️
            </span>
            <span className="text-lg font-bold">WeatherView</span>
          </div>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
            <SearchBar onSearch={search} disabled={status === 'loading'} />
            <UnitToggle unit={unit} onChange={setUnit} />
          </div>
        </div>
      </header>

      <main
        ref={mainRef}
        id="main-content"
        tabIndex={-1}
        aria-busy={status === 'loading'}
        className="mx-auto max-w-5xl space-y-8 px-4 py-8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-400"
      >
        <h1 className="sr-only">Previsão do tempo</h1>

        {status === 'idle' && (
          <EmptyState
            title="Busque uma cidade para começar"
            hint="Ex.: Seattle, Lisboa, São Paulo…"
          />
        )}

        {status === 'loading' && <LoadingState />}

        {status === 'empty' && (
          <EmptyState
            title="Nenhuma cidade encontrada."
            hint="Verifique a grafia e tente novamente."
          />
        )}

        {status === 'results' && <CityResults cities={cities} onSelect={selectCity} />}

        {status === 'error' && error && <ErrorState message={error} onRetry={retry} />}

        {status === 'success' && data && (
          <>
            <CurrentWeather city={data.city} current={data.current} unit={unit} />
            <ForecastList forecast={data.forecast} unit={unit} />
          </>
        )}
      </main>

      <footer className="px-4 py-8 text-center text-sm text-white/70">
        Dados por{' '}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
          className="text-accent-400 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
        >
          Open-Meteo
        </a>
      </footer>
    </div>
  );
}
