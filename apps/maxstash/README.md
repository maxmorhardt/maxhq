# Maxstash

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![MUI](https://img.shields.io/badge/MUI-%230081CB.svg?style=for-the-badge&logo=mui&logoColor=white)
![License](https://img.shields.io/badge/license-Apache%202.0-blue?style=for-the-badge)

## Overview

Personal portfolio website built with React 19 and TypeScript. Features a full-width landing page with an interactive terminal, scroll-driven animations, light/dark theming, and a router-based multi-page layout for showcasing projects, apps, background, and contact information.

## Features

- **React 19** with TypeScript
- **Material UI + Emotion** for the design system, driven by a single themed token set
- **React Router** framework mode for routing and build-time prerendering
- **Light / Dark Mode** via MUI color schemes, persisted and applied before first paint
- **Scroll Animations** powered by the `IntersectionObserver` API
- **ESLint + Prettier + Husky** for code quality
- **Vitest + Testing Library** for unit testing

## Architecture

The application is prerendered to static HTML by React Router in SPA mode — every route ships a real HTML file with its own title, description, and canonical, then hydrates into a client-routed app. Pages are lazy-loaded route chunks served behind a sticky header and full-width hero sections. Colors, spacing, and typography come from an MUI theme with `light` and `dark` color schemes emitted as CSS variables, so switching schemes repaints without re-rendering the tree.

## Development

This project uses [pnpm](https://pnpm.io) (`npm`/`yarn` installs are blocked). Enable it with `corepack enable`.

1. Install dependencies: `pnpm install`
2. Start the development server: `pnpm dev`
3. Open browser to `http://localhost:3000`

## Production Build

Build the application for production deployment:

```bash
pnpm build
```

Output is written to `dist/client/`, which is what the Docker image serves.

## License

Released under the [Apache License 2.0](./LICENSE).
