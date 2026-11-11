interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

/** Estado de erro com ação de "tentar novamente". */
export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-16 text-center">
      <span aria-hidden="true" className="text-4xl">
        ⚠️
      </span>
      <p className="max-w-full break-words text-white/80">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-night-900 transition hover:bg-accent-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
      >
        Tentar novamente
      </button>
    </div>
  );
}
