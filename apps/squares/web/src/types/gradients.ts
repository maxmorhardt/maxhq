export const gradients = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  secondary: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
  textGradient: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
  lightBlue: 'linear-gradient(135deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%)',
  black: 'linear-gradient(135deg, #0f1419 0%, #1a2332 100%)',
  pink: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  cyan: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
  mint: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  background: 'linear-gradient(135deg, #121212 0%, #1e1e1e 100%)',
};

export type GradientType = keyof typeof gradients;
