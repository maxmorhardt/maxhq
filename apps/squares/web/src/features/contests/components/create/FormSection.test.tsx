import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../../test/render';
import FormSection, { SectionDivider } from './FormSection';

describe('FormSection', () => {
  it('labels its field', () => {
    renderWithProviders(
      <FormSection title="Basics" description="A short name.">
        <input aria-label="name" />
      </FormSection>
    );
    expect(screen.getByText('Basics')).toBeInTheDocument();
    expect(screen.getByText('A short name.')).toBeInTheDocument();
    expect(screen.getByLabelText('name')).toBeInTheDocument();
  });

  it('works without help text, and the divider renders', () => {
    const { container } = renderWithProviders(
      <>
        <FormSection title="Basics">field</FormSection>
        <SectionDivider />
      </>
    );
    expect(container).toHaveTextContent('Basicsfield');
  });
});
