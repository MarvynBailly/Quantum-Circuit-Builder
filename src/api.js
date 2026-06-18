// Base URL for the verification API (Cloudflare Pages Functions).
//
// Empty string => same-origin calls to `/api/...` at the domain root,
// which is the production layout (functions are served from the Pages
// project root, e.g. https://marvyn.com/api/submit). Override with
// VITE_API_BASE for local dev when the static site and `wrangler pages
// dev` run on different origins.
export const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}
