import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatusTerminal from './StatusTerminal';
import { renderWithProviders } from '../../testUtils';

describe('StatusTerminal', () => {
  it('renders its title and every line', () => {
    renderWithProviders(
      <StatusTerminal
        title="404 · Not found"
        lines={[
          { text: 'cd /missing', kind: 'cmd' },
          { text: 'no such file or directory', kind: 'err' },
        ]}
      />
    );

    expect(screen.getByText('404 · Not found')).toBeInTheDocument();
    expect(screen.getByText('cd /missing')).toBeInTheDocument();
    expect(screen.getByText('no such file or directory')).toBeInTheDocument();
  });
});
