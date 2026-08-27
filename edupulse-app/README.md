# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## EduPulse development

```bash
npm install
npm run supabase:check
npm run dev
```

Copy `.env.example` to `.env.local` and provide the browser-safe Supabase URL and publishable key before running the app. Keep `SUPABASE_SECRET_KEY` server-only; never prefix it with `VITE_` or commit it.

Production deployments are managed by the Vercel Git integration for the `main` branch. GitHub Actions runs lint, typecheck, and build checks for pushes and pull requests.
