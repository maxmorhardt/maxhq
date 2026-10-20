import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('pages/LandingPage.tsx'),
  route('auth/callback', 'pages/CallbackPage.tsx'),
  route('contests', 'pages/ContestsPage.tsx'),
  route('contests/create', 'pages/CreateContestPage.tsx'),
  route('contests/:id', 'pages/ContestPage.tsx'),
  route('join/:token', 'pages/JoinPage.tsx'),
  route('leaderboard', 'pages/LeaderboardPage.tsx'),
  route('profile', 'pages/ProfilePage.tsx'),
  route('contact', 'pages/ContactPage.tsx'),
  route('learn-more', 'pages/LearnMorePage.tsx'),
  route('404', 'pages/NotFoundPage.tsx', { id: 'prerender-404' }),
  route('*', 'pages/NotFoundPage.tsx'),
] satisfies RouteConfig;
