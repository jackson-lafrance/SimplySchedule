# Simply Schedule iPhone app

The mobile app is an Expo/React Native iPhone foundation. It follows SimplyLift's existing conventions: Expo Router routes live under `src/app`, TypeScript is strict, imports use the `@/*` alias, and UI uses white surfaces, black 2px outlines, 8px cards, uppercase heavy labels, and system-inspired semantic accents.

## Run locally

```bash
npm install
npm run ios
```

`npm start` opens the Expo developer server. The initial route is intentionally a static schedule shell; product data, navigation, and event/task behavior are not implemented in this scaffold. Firebase project configuration and the initial Firestore model live in [`../firebase/README.md`](../firebase/README.md); the client SDK is not wired yet.

## Structure

- `src/app/` — Expo Router entry and future routes
- `src/theme/` — shared color, spacing, radius, and typography tokens
- `app.json` — portrait iPhone/Expo configuration
- `eas.json` — development, preview, and production build profiles
- `.env.example` — Firebase client configuration contract for a future Expo integration
