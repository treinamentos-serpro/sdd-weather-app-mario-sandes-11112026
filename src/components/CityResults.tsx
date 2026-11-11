import type { City } from '../types/weather';

interface CityResultsProps {
  cities: City[];
  onSelect: (city: City) => void;
}

/** Lista localidades para o usuário escolher antes de carregar a previsão. */
export default function CityResults({ cities, onSelect }: CityResultsProps) {
  return (
    <section aria-label="Resultados da busca" className="space-y-3">
      <h2 className="text-lg font-semibold">Selecione uma cidade</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {cities.map((city) => {
          const location = [city.region, city.country].filter(Boolean).join(', ');
          return (
            <li key={city.id}>
              <button
                type="button"
                onClick={() => onSelect(city)}
                className="flex min-h-11 w-full flex-col items-start rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur-md transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
              >
                <span className="font-semibold">{city.name}</span>
                <span className="text-sm text-white/70">
                  {location || 'Localidade indisponível'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
