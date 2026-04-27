import React from 'react';
import { renderLatex } from './katexCache.js';

/**
 * Render inline text with automatic LaTeX support (HTML context).
 *
 * KaTeX output is cached globally so repeated labels (\phi_{0}, etc.)
 * are only rendered once per unique string.
 */
function InlineLatex({ text, style }) {
  const html = renderLatex(text);
  if (html === null) {
    return <span style={style}>{text}</span>;
  }
  return <span style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default React.memo(InlineLatex);
