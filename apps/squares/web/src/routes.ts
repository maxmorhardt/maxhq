import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('pages/landing/LandingPage.tsx'),
  route('auth/callback', 'pages/auth/CallbackPage.tsx'),
  route('contests', 'pages/contests/ContestsPage.tsx'),
  route('leaderboard', 'pages/leaderboard/LeaderboardPage.tsx'),
  route('profile', 'pages/profile/ProfilePage.tsx'),
  route('contests/create', 'pages/contests/create/CreateContestPage.tsx'),
  route('contests/:id', 'pages/contests/contest/ContestPage.tsx'),
  route('join/:token', 'pages/join/JoinPage.tsx'),
  route('contact', 'pages/contact/ContactPage.tsx'),
  route('learn-more', 'pages/learn/LearnMorePage.tsx'),
  route('404', 'pages/error/NotFoundPage.tsx', { id: 'prerender-404' }),
  route('*', 'pages/error/NotFoundPage.tsx'),
] satisfies RouteConfig;
