# Squares Frontend

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Material-UI](https://img.shields.io/badge/MUI-%230081CB.svg?style=for-the-badge&logo=mui&logoColor=white)
![Redux](https://img.shields.io/badge/redux-%23593d88.svg?style=for-the-badge&logo=redux&logoColor=white)
![WebSocket](https://img.shields.io/badge/websocket-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

## Overview
A real-time collaborative grid application frontend built with React and TypeScript. Features OIDC authentication, Material-UI components, and WebSocket connections for real-time collaboration across multiple users.

## Features
- **React 19** with TypeScript for modern frontend development
- **OIDC Authentication** with react-oidc-context
- **Material-UI Components** for consistent design system
- **Redux Toolkit** for state management
- **Real-time Collaboration** via WebSocket connections
- **Responsive Design** with mobile-first approach
- **Hot Module Replacement** with Vite for fast development
- **ESLint & TypeScript** for code quality and type safety

## Architecture
The application uses WebSocket connections to enable real-time collaborative editing. When a user updates a cell, the change is immediately sent to the backend via HTTP request and then broadcasted to all connected clients through WebSocket messages, ensuring synchronized grid state across all users.

## Dependencies
This application requires the following services to be running:
- **Squares API Backend** for data persistence and WebSocket handling
- **OIDC Provider** (e.g., Keycloak) for authentication
- **Modern Web Browser** with WebSocket support

## Development
1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Open browser to `http://localhost:3000`

## Production Build
Build the application for production deployment:
```bash
npm run build
```

## Deployment
The application includes Docker configuration and Helm charts in the `helm/` directory for Kubernetes deployment. Configure your environment-specific values and deploy with:
```bash
helm install squares ./helm/squares
```
