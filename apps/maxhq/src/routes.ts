import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('pages/HomePage.tsx'),
  route('apps', 'pages/AppsPage.tsx'),
  route('projects', 'pages/ProjectsPage.tsx'),
  route('about', 'pages/AboutPage.tsx'),
  route('contact', 'pages/ContactPage.tsx'),
  route('terms-of-service', 'pages/TermsOfServicePage.tsx'),
  route('privacy-policy', 'pages/PrivacyPolicyPage.tsx'),
  route('404', 'pages/NotFoundPage.tsx', { id: 'prerender-404' }),
  route('*', 'pages/NotFoundPage.tsx'),
] satisfies RouteConfig;
