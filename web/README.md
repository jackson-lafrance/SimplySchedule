# Simply Schedule web

The web client is a Vite/React/TypeScript foundation for Simply Schedule. It is intentionally limited to a responsive schedule shell; task, subtask, calendar, event, and Firebase behavior will be added separately.

## Run locally

```bash
npm install
npm run dev
```

Use `npm run build` for a production build, `npm run typecheck` for strict TypeScript checking, and `npm run lint` for the project ESLint configuration. Firebase project configuration and the initial Firestore model live in [`../firebase/README.md`](../firebase/README.md); the client SDK is not wired yet.

## Structure

- `src/main.tsx` — browser entry point
- `src/App.tsx` — minimal schedule shell
- `src/styles.css` — responsive web presentation layer
- `src/theme/` — SimplyLift-inspired semantic tokens
- `vite.config.ts` — Vite and `@/*` import alias configuration
- `.env.example` — Firebase client configuration contract for a future Vite integration
