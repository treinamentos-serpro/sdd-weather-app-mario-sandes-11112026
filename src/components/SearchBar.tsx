import { useState, type FormEvent } from 'react';

interface SearchBarProps {
  onSearch: (city: string) => void;
  disabled?: boolean;
}

/** Barra de busca de cidade. Bloqueia submit com input vazio. */
export default function SearchBar({ onSearch, disabled }: SearchBarProps) {
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSearch(trimmed);
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-md transition focus-within:border-accent-500 focus-within:ring-2 focus-within:ring-accent-500/60">
        <span aria-hidden="true" className="text-white/50">
          🔍
        </span>
        <label htmlFor="city-search" className="sr-only">
          Buscar cidade
        </label>
        <input
          id="city-search"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Buscar cidade…"
          autoComplete="off"
          aria-describedby={!value.trim() ? 'city-search-hint' : undefined}
          disabled={disabled}
          className="min-h-11 min-w-0 flex-1 bg-transparent text-white placeholder-white/70 outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="min-h-11 shrink-0 rounded-lg bg-accent-500 px-4 text-sm font-semibold text-night-900 transition enabled:hover:bg-accent-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Buscar
        </button>
      </div>
      {!value.trim() && (
        <p id="city-search-hint" className="mt-2 text-sm text-white/70">
          Digite uma cidade para pesquisar.
        </p>
      )}
    </form>
  );
}
