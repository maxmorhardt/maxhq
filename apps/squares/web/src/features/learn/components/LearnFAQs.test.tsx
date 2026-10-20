import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material';
import LearnFAQs from './LearnFAQs';

const theme = createTheme({ palette: { mode: 'dark' } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('LearnFAQs', () => {
  it('renders the question text', () => {
    render(<LearnFAQs question="What is Squares?" answer="A popular betting pool game." />, {
      wrapper,
    });
    expect(screen.getByText('What is Squares?')).toBeInTheDocument();
  });

  it('expands to reveal the answer when clicked', () => {
    render(<LearnFAQs question="What is Squares?" answer="A popular betting pool game." />, {
      wrapper,
    });
    fireEvent.click(screen.getByText('What is Squares?'));
    expect(screen.getByText('A popular betting pool game.')).toBeInTheDocument();
  });

  it('renders the expand icon', () => {
    const { container } = render(
      <LearnFAQs question="What is Squares?" answer="A popular betting pool game." />,
      { wrapper }
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
