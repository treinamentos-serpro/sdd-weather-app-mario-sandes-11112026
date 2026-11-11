import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import SearchBar from '../../src/components/SearchBar';

describe('SearchBar', () => {
  it('expõe uma região de busca e um campo com nome acessível', () => {
    render(<SearchBar onSearch={vi.fn()} />);

    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /buscar cidade/i })).toBeInTheDocument();
  });

  it('não dispara busca com input vazio', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    await user.click(screen.getByRole('button', { name: /buscar/i }));
    await user.click(screen.getByLabelText(/buscar cidade/i));
    await user.keyboard('{Enter}');
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/buscar cidade/i)).toHaveAccessibleDescription(
      'Digite uma cidade para pesquisar.',
    );
  });

  it('não dispara busca quando o input contém apenas espaços', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    await userEvent.type(screen.getByRole('textbox', { name: /buscar cidade/i }), '   ');
    expect(screen.getByRole('button', { name: /buscar/i })).toBeDisabled();
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByText('Digite uma cidade para pesquisar.')).toBeInTheDocument();
  });

  it('preserva acentos e caracteres especiais removendo apenas espaços externos', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    await user.type(screen.getByLabelText('Buscar cidade'), "  São Paulo & D'Ávila + /?  ");
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(onSearch).toHaveBeenCalledExactlyOnceWith("São Paulo & D'Ávila + /?");
    expect(screen.queryByText('Digite uma cidade para pesquisar.')).not.toBeInTheDocument();
  });
  it.each(['clique', 'Enter'])('dispara busca uma vez com o termo normalizado por %s', async (method) => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    await user.type(screen.getByLabelText(/buscar cidade/i), '  Lisboa  ');
    if (method === 'Enter') {
      await user.keyboard('{Enter}');
    } else {
      await user.click(screen.getByRole('button', { name: /buscar/i }));
    }
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('Lisboa');
  });

  it('desabilita o campo e a submissão quando disabled está ativo', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} disabled />);

    expect(screen.getByRole('textbox', { name: /buscar cidade/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /buscar/i })).toBeDisabled();
    expect(onSearch).not.toHaveBeenCalled();
  });
});
