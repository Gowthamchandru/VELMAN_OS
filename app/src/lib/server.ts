// Base URL of the local assistant/news server (server/index.mjs).
// Override with VITE_GCOS_SERVER at build time if it runs elsewhere.
export const SERVER =
  (import.meta.env.VITE_GCOS_SERVER as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8787'
