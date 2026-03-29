import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import NotFound from '@/pages/NotFound';

describe('NotFound', () => {
  it('renders 404 message', () => {
    render(<NotFound />);

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Página não encontrada.')).toBeInTheDocument();
  });

  it('has a link back to home', () => {
    render(<NotFound />);

    const link = screen.getByRole('link', { name: /voltar ao dashboard/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/dashboard');
  });
});
