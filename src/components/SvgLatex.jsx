import React from 'react';
import { renderLatex } from './katexCache.js';

/**
 * Render a text label inside SVG, with automatic LaTeX support.
 *
 * If the text contains LaTeX-like characters (\, _, ^, {, }),
 * it is rendered through KaTeX (cached) inside a <foreignObject>.
 * Otherwise it renders as a plain SVG <text> element.
 */
function SvgLatex({
  text,
  x,
  y,
  fontSize = 12,
  color = 'var(--text-primary)',
  fontWeight = 400,
}) {
  const html = renderLatex(text);

  if (html === null) {
    return (
      <text
        x={x}
        y={y + fontSize * 0.35}
        textAnchor="middle"
        fill={color}
        fontSize={fontSize}
        fontWeight={fontWeight}
        fontFamily="var(--font-mono)"
        style={{ pointerEvents: 'none' }}
      >
        {text}
      </text>
    );
  }

  const w = 120;
  const h = 32;

  return (
    <foreignObject
      x={x - w / 2}
      y={y - h / 2}
      width={w}
      height={h}
      style={{ overflow: 'visible', pointerEvents: 'none' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          color,
          fontSize,
          pointerEvents: 'none',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </foreignObject>
  );
}

export default React.memo(SvgLatex);
