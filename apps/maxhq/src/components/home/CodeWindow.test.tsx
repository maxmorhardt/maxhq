import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CodeWindow from './CodeWindow';
import { renderWithProviders } from '../../testUtils';

describe('CodeWindow', () => {
  it('shows the open file as the first tab', () => {
    renderWithProviders(<CodeWindow />);

    expect(screen.getByText('contest_service.go')).toBeInTheDocument();
  });

  it('renders the excerpt with its source line numbers', () => {
    renderWithProviders(<CodeWindow />);

    expect(screen.getByText('PublishSquareUpdate')).toBeInTheDocument();
    expect(screen.getByText('360')).toBeInTheDocument();
    expect(screen.getByText('370')).toBeInTheDocument();
  });

  it('captions what the excerpt shows', () => {
    renderWithProviders(<CodeWindow />);

    expect(screen.getByText(/commit in one transaction/)).toBeInTheDocument();
  });
});
