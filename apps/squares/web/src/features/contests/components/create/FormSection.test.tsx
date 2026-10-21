import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../../test/render';
import FormSection from './FormSection';

describe('FormSection', () => {
  it('numbers and labels its step', () => {
    renderWithProviders(
      <FormSection step={2} title="Name it" description="A short name.">
        <input aria-label="name" />
      </FormSection>
    );
    expect(screen.getByRole('region', { name: 'Name it' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Name it' })).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('A short name.')).toBeInTheDocument();
  });

  it('works without help text', () => {
    const { container } = renderWithProviders(
      <FormSection step={1} title="Basics">
        field
      </FormSection>
    );
    expect(container).toHaveTextContent('1Basicsfield');
  });
});
