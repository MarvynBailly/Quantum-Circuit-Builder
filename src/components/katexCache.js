import katex from 'katex';

const LATEX_RE = /[\\_{^}]/;
const CACHE_LIMIT = 4096;
const cache = new Map();

export function isLatex(text) {
  return LATEX_RE.test(text);
}

/** Render a (short) LaTeX string to HTML once and reuse the result.
 *  The cache is a simple bounded Map; on overflow we drop the oldest
 *  entries. Labels in this app are highly repetitive (\phi_{0}, C_{1},
 *  …) so hit rate is near 100% after the first frame. */
export function renderLatex(text) {
  if (!isLatex(text)) return null;
  const hit = cache.get(text);
  if (hit !== undefined) return hit;
  let html;
  try {
    html = katex.renderToString(text, { throwOnError: false, displayMode: false });
  } catch {
    html = null;
  }
  if (cache.size >= CACHE_LIMIT) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(text, html);
  return html;
}
