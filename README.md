# Mileage Guru

Mileage Guru is a mobile-friendly fuel and mileage tracker for managing multiple vehicles.
It helps you record start reading, fuel fills, and end reading in a guided flow, then calculates distance, fuel consumed, and mileage.

## Live App

https://mileageguru.vercel.app

## Features

- Multi-vehicle management
- Guided 3-step mileage workflow:
  - Start meter reading
  - Fuel fills
  - End meter reading
- Auto mileage calculations:
  - Total fuel used
  - Distance covered
  - Mileage (kmpl)
- Last closed mileage cycle summary
- Floating global error notifications
- Progressive Web App (PWA) support with installable icons
- Local persistence using browser `localStorage`

## Tech Stack

- React
- Vite
- `vite-plugin-pwa`
- ESLint

## Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- npm

### Install

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## PWA Notes

This app is configured as a PWA via `vite-plugin-pwa`.

- App icons: `public/pwa-192.svg`, `public/pwa-512.svg`
- Favicon: `public/favicon.svg`
- Manifest is generated during build.

If icon updates do not appear immediately, clear browser cache or do a hard refresh.

## Project Structure

```text
.
|- public/
|  |- favicon.svg
|  |- pwa-192.svg
|  |- pwa-512.svg
|- src/
|  |- App.jsx
|  |- App.css
|  |- index.css
|  |- main.jsx
|- vite.config.js
|- package.json
|- README.md
```

## How Mileage Is Calculated

- Distance = `endReading - startReading`
- Total fuel = sum of all fill liters in the cycle
- Mileage (kmpl) = `distance / totalFuel`

## Data Storage

Vehicle and mileage data is saved in the browser under:

- `localStorage` key: `mileagepro-cycles-v2`

No backend is required for core usage.

## Deployment

The app is currently deployed at:

- https://mileageguru.vercel.app
