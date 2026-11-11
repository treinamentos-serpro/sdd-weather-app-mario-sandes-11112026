import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import LoadingState from '../../src/components/states/LoadingState';
import ErrorState from '../../src/components/states/ErrorState';
import EmptyState from '../../src/components/states/EmptyState';

describe('LoadingState', () => {
  it('anuncia o carregamento com role status e nome acessível', () => {
    render(<LoadingState />);

    const status = screen.getByRole('status', { name: 'Carregando o clima' });
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Carregando o clima…');
  });
});

describe('ErrorState', () => {
  it.each([
    'Não foi possível carregar os dados. Tente novamente.',
    'A solicitação expirou. Tente novamente.',
  ])('mostra a mensagem recebida: %s', (message) => {
    render(<ErrorState message={message} onRetry={vi.fn()} />);

    expect(within(screen.getByRole('alert')).getByText(message)).toBeInTheDocument();
  });

  it('aciona onRetry uma vez por clique', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState message="Falha ao carregar." onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('permite focar e tentar novamente pelo teclado', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState message="Falha ao carregar." onRetry={onRetry} />);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('EmptyState', () => {
  it('anuncia o título e a dica recebidos', () => {
    render(<EmptyState title="Nenhuma cidade encontrada." hint="Verifique a grafia." />);

    const status = within(screen.getByRole('status'));
    expect(status.getByRole('heading', { name: 'Nenhuma cidade encontrada.' })).toBeInTheDocument();
    expect(status.getByText('Verifique a grafia.')).toBeInTheDocument();
  });

  it('aceita um título sem dica', () => {
    render(<EmptyState title="Busque uma cidade para começar" />);

    expect(screen.getByRole('heading', { name: 'Busque uma cidade para começar' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
