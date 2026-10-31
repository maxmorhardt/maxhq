# Squares

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Material-UI](https://img.shields.io/badge/MUI-%230081CB.svg?style=for-the-badge&logo=mui&logoColor=white)
![Redux](https://img.shields.io/badge/redux-%23593d88.svg?style=for-the-badge&logo=redux&logoColor=white)

## Overview

A real-time collaborative grid application frontend built with React and TypeScript. Features OIDC authentication, Material-UI components, and server-sent events for real-time collaboration across multiple users.

## Features

- **React 19** with TypeScript for modern frontend development
- **OIDC Authentication** with react-oidc-context
- **Material-UI Components** for consistent design system
- **Redux Toolkit and RTK Query** for server data, caching, retries, and the live contest state
- **Real-time Collaboration** via typed server-sent events that resume with `Last-Event-ID` after a dropped connection
- **ESLint & TypeScript** for code quality and type safety

## Architecture

Each contest page opens one event stream to the realtime service. It starts with a `contest.snapshot`, then receives one typed event per change (`square.updated`, `contest.updated`, `quarter.recorded`, and so on). A change is sent to the contests service over HTTP, committed with its event in the same transaction, and delivered to every open stream for that contest. A client that drops and reconnects sends the id of the last event it applied and receives only what it missed.

The stream fetches a fresh token for every connection and reconnects as soon as a sleeping tab wakes up, so an expired session never leaves the page waiting.

`AGENTS.md` describes the folder layout and where pages, containers, and components draw the line.

## Dependencies

This application requires the following services to be running:

- **Squares API services** (contests, games, accounts, realtime) behind the `api.maxhq.io/squares` gateway
- **OIDC Provider** (Dex, with Google, Microsoft, and GitHub sign-in) for authentication
- **Modern Web Browser** with `fetch` streaming (`ReadableStream`) support

## Development

This project uses [pnpm](https://pnpm.io) (enforced — `npm`/`yarn` installs are blocked). Enable it with `corepack enable`.

1. Install dependencies: `pnpm install`
2. Start the development server: `pnpm dev`
3. Open browser to `http://localhost:3000`

## Production Build

Build the application for production deployment:

```bash
pnpm build
```
