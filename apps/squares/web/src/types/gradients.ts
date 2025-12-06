export const gradients = {
  primary: '#1F78B4',
  secondary: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
  textGradient: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
  lightBlue: 'linear-gradient(135deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%)',
  black: 'linear-gradient(135deg, #2a2e35 0%, #1e2128 100%)',
  pink: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  cyan: '#AECEE3',
  mint: '#B2DF8A',
  green: '#33A02C',
  background: 'linear-gradient(135deg, #121212 0%, #1e1e1e 100%)',
};

export type GradientType = keyof typeof gradients;
