import React, { useEffect, useState } from 'react';

/* ------------------------------ animations ------------------------------ */

// All keyframes live in one inline stylesheet that mounts with the
// component — keeps the tutorial self-contained so it can ship without
// touching index.css. Class names are prefixed `tut-` to avoid clashes.
const ANIM_CSS = `
.tut-cursor { fill: var(--text-primary); stroke: #000; stroke-width: 0.8; }
.tut-pulse { fill: none; stroke: var(--accent-amber); stroke-width: 2; opacity: 0; }

/* ---- step 1: pick the Wire tool, then draw a chain ----
 * Cursor tip is at the local (0,0) of its <g>. Each translate target
 * is the button-center / vertex coordinate, so the tip lands on it.
 */
@keyframes tut-move-AB {
  0%,8%    { transform: translate(230px, 115px); }
  18%,28%  { transform: translate(68px, 17px); }
  38%,48%  { transform: translate(40px, 80px); }
  58%,68%  { transform: translate(120px, 80px); }
  78%,100% { transform: translate(200px, 80px); }
}
.tut-cursor-AB { animation: tut-move-AB 5s ease-in-out infinite; }

@keyframes tut-pulse-tool {
  0%,18% { opacity: 0; r: 4; }
  22%    { opacity: 1; r: 4; }
  35%    { opacity: 0; r: 16; }
  100%   { opacity: 0; r: 4; }
}
.tut-pulseTool { animation: tut-pulse-tool 5s ease-out infinite; }

@keyframes tut-pulse-A {
  0%,38% { opacity: 0; r: 4; }
  42%    { opacity: 1; r: 4; }
  55%    { opacity: 0; r: 14; }
  100%   { opacity: 0; r: 4; }
}
@keyframes tut-pulse-B {
  0%,58% { opacity: 0; r: 4; }
  62%    { opacity: 1; r: 4; }
  75%    { opacity: 0; r: 14; }
  100%   { opacity: 0; r: 4; }
}
@keyframes tut-pulse-C {
  0%,78% { opacity: 0; r: 4; }
  82%    { opacity: 1; r: 4; }
  95%    { opacity: 0; r: 14; }
  100%   { opacity: 0; r: 4; }
}
.tut-pulseA { animation: tut-pulse-A 5s ease-out infinite; }
.tut-pulseB { animation: tut-pulse-B 5s ease-out infinite; }
.tut-pulseC { animation: tut-pulse-C 5s ease-out infinite; }

@keyframes tut-grow-wire1 {
  0%,55%   { stroke-dashoffset: 80; }
  68%,100% { stroke-dashoffset: 0;  }
}
@keyframes tut-grow-wire2 {
  0%,75%   { stroke-dashoffset: 80; }
  88%,100% { stroke-dashoffset: 0;  }
}
.tut-wire1 { stroke: var(--wire-color); stroke-width: 2.5; fill:none; stroke-linecap: round;
             stroke-dasharray: 80; stroke-dashoffset: 80;
             animation: tut-grow-wire1 5s ease-in-out infinite; }
.tut-wire2 { stroke: var(--wire-color); stroke-width: 2.5; fill:none; stroke-linecap: round;
             stroke-dasharray: 80; stroke-dashoffset: 80;
             animation: tut-grow-wire2 5s ease-in-out infinite; }

/* "Wire" toolbar button switches from idle → active when clicked. */
@keyframes tut-wireBtn {
  0%,18%   { fill: transparent; stroke: var(--border); }
  22%,100% { fill: var(--tool-active-bg); stroke: var(--accent-blue); }
}
.tut-wireBtn { animation: tut-wireBtn 5s ease-in-out infinite; }

/* ---- step 2: pick C from the toolbar, drop it; then pick JJ, drop it ---- */
@keyframes tut-move-CL {
  0%,5%    { transform: translate(230px, 115px); }
  15%,22%  { transform: translate(109px, 17px); }   /* C button center */
  32%,40%  { transform: translate(90px, 90px); }    /* drop the capacitor */
  50%,58%  { transform: translate(175px, 17px); }   /* JJ button center */
  68%,100% { transform: translate(160px, 90px); }   /* drop the JJ */
}
.tut-cursor-CL { animation: tut-move-CL 6.6s ease-in-out infinite; }

@keyframes tut-pulse-toolC {
  0%,15% { opacity: 0; r: 4; }
  19%    { opacity: 1; r: 4; }
  30%    { opacity: 0; r: 16; }
  100%   { opacity: 0; r: 4; }
}
.tut-pulseToolC { animation: tut-pulse-toolC 6.6s ease-out infinite; }

@keyframes tut-pulse-CL {
  0%,32% { opacity: 0; r: 4; }
  36%    { opacity: 1; r: 4; }
  48%    { opacity: 0; r: 14; }
  100%   { opacity: 0; r: 4; }
}
.tut-pulseCL { animation: tut-pulse-CL 6.6s ease-out infinite; }

@keyframes tut-pulse-toolJ {
  0%,50% { opacity: 0; r: 4; }
  54%    { opacity: 1; r: 4; }
  65%    { opacity: 0; r: 16; }
  100%   { opacity: 0; r: 4; }
}
.tut-pulseToolJ { animation: tut-pulse-toolJ 6.6s ease-out infinite; }

@keyframes tut-pulse-JJ {
  0%,68% { opacity: 0; r: 4; }
  72%    { opacity: 1; r: 4; }
  84%    { opacity: 0; r: 14; }
  100%   { opacity: 0; r: 4; }
}
.tut-pulseJJ { animation: tut-pulse-JJ 6.6s ease-out infinite; }

/* C button: idle → active on first click → idle again when JJ is picked. */
@keyframes tut-cBtn {
  0%,15%   { fill: transparent; stroke: var(--border); }
  19%,50%  { fill: var(--tool-active-bg); stroke: var(--accent-blue); }
  54%,100% { fill: transparent; stroke: var(--border); }
}
.tut-cBtn { animation: tut-cBtn 6.6s ease-in-out infinite; }

@keyframes tut-jjBtn {
  0%,50%   { fill: transparent; stroke: var(--border); }
  54%,100% { fill: var(--tool-active-bg); stroke: var(--accent-blue); }
}
.tut-jjBtn { animation: tut-jjBtn 6.6s ease-in-out infinite; }

@keyframes tut-comp-fade {
  0%,33%   { opacity: 0; transform: scale(0.6); }
  45%,100% { opacity: 1; transform: scale(1); }
}
.tut-comp { animation: tut-comp-fade 6.6s ease-out infinite; transform-origin: 90px 90px; }

@keyframes tut-comp2-fade {
  0%,68%   { opacity: 0; transform: scale(0.6); }
  82%,100% { opacity: 1; transform: scale(1); }
}
.tut-comp2 { animation: tut-comp2-fade 6.6s ease-out infinite; transform-origin: 160px 90px; }

/* ---- step 3: select / properties ---- */
@keyframes tut-move-sel {
  0%,30% { transform: translate(20px, 70px); }
  45%    { transform: translate(85px, 38px); }
  100%   { transform: translate(85px, 38px); }
}
.tut-cursor-sel { animation: tut-move-sel 4s ease-in-out infinite; }
@keyframes tut-pulse-sel {
  0%,42% { opacity: 0; r: 4; }
  45%    { opacity: 1; r: 4; }
  60%    { opacity: 0; r: 14; }
  100%   { opacity: 0; r: 4; }
}
.tut-pulseSel { animation: tut-pulse-sel 4s ease-out infinite; }
@keyframes tut-panel-slide {
  0%,55% { opacity: 0; transform: translateX(20px); }
  72%,100% { opacity: 1; transform: translateX(0); }
}
.tut-panel { animation: tut-panel-slide 4s ease-out infinite; }
@keyframes tut-comp-highlight {
  0%,55% { stroke: var(--wire-color); }
  60%,100% { stroke: var(--accent-blue); }
}
.tut-compSel * { animation: tut-comp-highlight 4s ease-in-out infinite; }

/* ---- step 4: drag a vertex, then a component, then undo ----
 * All animations share the same 6s cycle so the cursor, the vertex,
 * the wire, and the component move in lockstep.
 */
@keyframes tut-move-drag {
  0%,5%    { transform: translate(250px, 125px); }
  12%,16%  { transform: translate(140px, 30px); }
  26%,30%  { transform: translate(220px, 30px); }
  38%,42%  { transform: translate(90px, 85px); }
  58%,62%  { transform: translate(170px, 85px); }
  74%,84%  { transform: translate(35px, 120px); }
  95%,100% { transform: translate(250px, 125px); }
}
.tut-cursor-drag { animation: tut-move-drag 6s ease-in-out infinite; }

@keyframes tut-vert-drag {
  0%,16%   { cx: 140; }
  30%,82%  { cx: 220; }
  90%,100% { cx: 140; }
}
.tut-vert-drag { animation: tut-vert-drag 6s ease-in-out infinite; }

@keyframes tut-wire-stretch {
  0%,16%   { d: path('M40 30 L140 30'); }
  30%,82%  { d: path('M40 30 L220 30'); }
  90%,100% { d: path('M40 30 L140 30'); }
}
.tut-wire-stretch { animation: tut-wire-stretch 6s ease-in-out infinite;
                    stroke: var(--wire-color); stroke-width: 2.5; fill:none; stroke-linecap: round; }

@keyframes tut-comp-drag {
  0%,40%   { transform: translate(90px, 85px); }
  60%,82%  { transform: translate(170px, 85px); }
  90%,100% { transform: translate(90px, 85px); }
}
.tut-comp-drag { animation: tut-comp-drag 6s ease-in-out infinite; }

/* Ctrl+Z chip pulses amber when the undo fires — synced to the
 * snap-back of the vertex / wire / component above. */
.tut-key-undo { fill: var(--bg-input); stroke: var(--border); }
@keyframes tut-undo-pulse {
  0%,76%   { fill: var(--bg-input); stroke: var(--border); }
  82%,88%  { fill: var(--accent-amber); stroke: var(--accent-amber); }
  93%,100% { fill: var(--bg-input); stroke: var(--border); }
}
.tut-key-undo { animation: tut-undo-pulse 6s ease-in-out infinite; }

/* ---- adv 1: shift+click multi ---- */
@keyframes tut-cursor-shift {
  0%,10%  { transform: translate(40px, 40px); }
  25%     { transform: translate(80px, 40px); }
  45%     { transform: translate(80px, 40px); }
  60%     { transform: translate(180px, 40px); }
  85%,100% { transform: translate(180px, 40px); }
}
.tut-cursor-shift { animation: tut-cursor-shift 4.4s ease-in-out infinite; }
@keyframes tut-sel-1 {
  0%,22%  { stroke: var(--wire-color); }
  25%,100% { stroke: var(--accent-blue); }
}
.tut-sel1 * { animation: tut-sel-1 4.4s ease-in-out infinite; }
@keyframes tut-sel-2 {
  0%,57%  { stroke: var(--wire-color); }
  60%,100% { stroke: var(--accent-blue); }
}
.tut-sel2 * { animation: tut-sel-2 4.4s ease-in-out infinite; }
@keyframes tut-shift-key {
  0%,8%  { fill: var(--bg-input); }
  10%,75% { fill: var(--accent-amber); }
  78%,100% { fill: var(--bg-input); }
}
.tut-shiftKey { animation: tut-shift-key 4.4s ease-in-out infinite; }

/* ---- adv 2: copy / paste ---- */
@keyframes tut-paste {
  0%,40% { opacity: 0; transform: translate(0,0); }
  55%    { opacity: 1; transform: translate(15px,15px); }
  100%   { opacity: 1; transform: translate(15px,15px); }
}
.tut-pasteBlock { animation: tut-paste 3.6s ease-out infinite; }
@keyframes tut-key-c {
  0%,18% { fill: var(--bg-input); }
  20%,30% { fill: var(--accent-amber); }
  32%,100% { fill: var(--bg-input); }
}
@keyframes tut-key-v {
  0%,42% { fill: var(--bg-input); }
  45%,55% { fill: var(--accent-amber); }
  57%,100% { fill: var(--bg-input); }
}
.tut-keyC { animation: tut-key-c 3.6s ease-in-out infinite; }
.tut-keyV { animation: tut-key-v 3.6s ease-in-out infinite; }

/* ---- adv 3: rotate ---- */
@keyframes tut-rotate {
  0%,15%  { transform: rotate(0deg); }
  35%,55% { transform: rotate(90deg); }
  75%,100% { transform: rotate(180deg); }
}
.tut-rotateGroup { animation: tut-rotate 4s ease-in-out infinite; transform-origin: 110px 50px; transform-box: fill-box; }

/* ---- adv 4: mirror ---- */
@keyframes tut-mirror {
  0%,30% { transform: scaleX(1); }
  50%,75% { transform: scaleX(-1); }
  95%,100% { transform: scaleX(1); }
}
.tut-mirrorGroup { animation: tut-mirror 3.8s ease-in-out infinite; transform-origin: 110px 50px; transform-box: fill-box; }

/* ---- adv 5: merge ---- */
@keyframes tut-merge-cursor {
  0%,12% { transform: translate(60px, 30px); }
  28%    { transform: translate(60px, 30px); }
  60%    { transform: translate(150px, 30px); }
  100%   { transform: translate(150px, 30px); }
}
.tut-cursor-merge { animation: tut-merge-cursor 3.8s ease-in-out infinite; }
@keyframes tut-merge-vert {
  0%,12% { cx: 60; opacity: 1; }
  28%    { cx: 60; opacity: 1; }
  60%    { cx: 150; opacity: 1; }
  68%    { cx: 150; opacity: 0; }
  100%   { cx: 150; opacity: 0; }
}
.tut-mergeVert { animation: tut-merge-vert 3.8s ease-in-out infinite; }
@keyframes tut-merge-target {
  0%,60% { stroke: var(--wire-color); r: 5; }
  68%    { stroke: var(--accent-amber); r: 8; }
  100%   { stroke: var(--accent-amber); r: 6; }
}
.tut-mergeTarget { animation: tut-merge-target 3.8s ease-in-out infinite; }

/* ---- adv 6: box-select ---- */
@keyframes tut-box-grow {
  0%,15% { width: 0; height: 0; opacity: 0; }
  20%    { opacity: 1; }
  60%,100% { width: 130px; height: 60px; opacity: 1; }
}
.tut-box {
  fill: var(--accent-blue); fill-opacity: 0.1;
  stroke: var(--accent-blue); stroke-width: 1.2;
  stroke-dasharray: 4 3;
  animation: tut-box-grow 3.6s ease-out infinite;
}
@keyframes tut-box-cursor {
  0%,15%  { transform: translate(40px, 30px); }
  60%,100% { transform: translate(170px, 90px); }
}
.tut-cursor-box { animation: tut-box-cursor 3.6s ease-out infinite; }
@keyframes tut-box-sel {
  0%,55% { stroke: var(--wire-color); }
  62%,100% { stroke: var(--accent-blue); }
}
.tut-boxSel * { animation: tut-box-sel 3.6s ease-in-out infinite; }
@keyframes tut-ctrl-key {
  0%,8%   { fill: var(--bg-input); }
  10%,90% { fill: var(--accent-amber); }
  92%,100% { fill: var(--bg-input); }
}
.tut-ctrlKey { animation: tut-ctrl-key 3.6s ease-in-out infinite; }
`;

/* ---------------------------- shared svg bits --------------------------- */

const Cursor = ({ className }) => (
  <g className={className}>
    <path
      d="M0 0 L0 14 L4 11 L7 17 L9 16 L6 10 L11 10 Z"
      className="tut-cursor"
    />
  </g>
);

const Capacitor = ({ x, y }) => (
  <g transform={`translate(${x},${y})`}>
    <line x1="-12" y1="0" x2="-3" y2="0" stroke="var(--wire-color)" strokeWidth="2" />
    <line x1="12" y1="0" x2="3" y2="0" stroke="var(--wire-color)" strokeWidth="2" />
    <line x1="-3" y1="-7" x2="-3" y2="7" stroke="var(--accent-blue)" strokeWidth="2" />
    <line x1="3" y1="-7" x2="3" y2="7" stroke="var(--accent-blue)" strokeWidth="2" />
  </g>
);

const JJ = ({ x, y }) => (
  <g transform={`translate(${x},${y})`}>
    <line x1="-12" y1="0" x2="-5" y2="0" stroke="var(--wire-color)" strokeWidth="2" />
    <line x1="12" y1="0" x2="5" y2="0" stroke="var(--wire-color)" strokeWidth="2" />
    <line x1="-5" y1="-5" x2="5" y2="5" stroke="var(--accent-amber)" strokeWidth="2" />
    <line x1="-5" y1="5" x2="5" y2="-5" stroke="var(--accent-amber)" strokeWidth="2" />
  </g>
);

const Inductor = ({ x, y }) => (
  <g transform={`translate(${x},${y})`}>
    <line x1="-16" y1="0" x2="-9" y2="0" stroke="var(--wire-color)" strokeWidth="2" />
    <line x1="16" y1="0" x2="9" y2="0" stroke="var(--wire-color)" strokeWidth="2" />
    <path
      d="M-9 0 a3 3 0 0 1 6 0 a3 3 0 0 1 6 0 a3 3 0 0 1 6 0"
      fill="none"
      stroke="var(--accent-green)"
      strokeWidth="2"
    />
  </g>
);

const Vertex = ({ cx, cy, className }) => (
  <circle cx={cx} cy={cy} r="4" fill="var(--bg-input)" stroke="var(--wire-color)" strokeWidth="2" className={className} />
);

// Inline keycap chip used in step bodies. Hoisted above the step
// constants so module evaluation finds it (the steps below close over
// `kbd` at construction time).
const kbd = {
  display: 'inline-block',
  padding: '1px 6px',
  borderRadius: 4,
  border: '1px solid var(--border)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontSize: 11,
  fontFamily: 'inherit',
  margin: '0 2px',
};

/* ----------------------------- step content ----------------------------- */

const stepWelcome = {
  title: 'Welcome',
  body: (
    <>
      <p>
        Build a superconducting circuit visually and extract the
        Hamiltonian, capacitance matrix, and energies in real time.
      </p>
      <p>
        The next few steps walk through the basics. You can skip or close at any
        time — you can always re-launch the tutorial from the <b>Help</b> button.
      </p>
    </>
  ),
  anim: (
    <svg width="240" height="100" viewBox="0 0 240 100">
      <line x1="40" y1="50" x2="200" y2="50" stroke="var(--wire-color)" strokeWidth="2.5" />
      <Vertex cx={40} cy={50} />
      <Vertex cx={200} cy={50} />
      <Capacitor x={120} y={50} />
    </svg>
  ),
};

// Mock toolbar drawn at the top of the wire / component animations.
// `animate` is a set of button keys that should be driven by the
// step's keyframes (e.g. {wire:true} or {C:true, jj:true}).
const MockToolbar = ({ animate = {} }) => {
  const idleFill = 'transparent';
  const idleStroke = 'var(--border)';
  return (
    <>
      <rect x="0" y="0" width="280" height="34" fill="var(--bg-panel)" stroke="var(--border)" />
      <text x="8" y="20" fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-mono)">
        TOOLS:
      </text>
      {/* Wire button — center (68, 17) */}
      <rect
        x="48"
        y="8"
        width="40"
        height="18"
        rx="4"
        fill={idleFill}
        stroke={idleStroke}
        className={animate.wire ? 'tut-wireBtn' : undefined}
      />
      <text x="68" y="20" textAnchor="middle" fontSize="10" fill="var(--text-primary)" fontFamily="var(--font-mono)">Wire</text>
      {/* C button — center (109, 17) */}
      <rect
        x="96"
        y="8"
        width="26"
        height="18"
        rx="4"
        fill={idleFill}
        stroke={idleStroke}
        className={animate.C ? 'tut-cBtn' : undefined}
      />
      <text x="109" y="20" textAnchor="middle" fontSize="10" fill="var(--text-primary)" fontFamily="var(--font-mono)">C</text>
      {/* L button — center (141, 17) */}
      <rect x="128" y="8" width="26" height="18" rx="4" fill={idleFill} stroke={idleStroke} />
      <text x="141" y="20" textAnchor="middle" fontSize="10" fill="var(--text-primary)" fontFamily="var(--font-mono)">L</text>
      {/* JJ button — center (175, 17) */}
      <rect
        x="160"
        y="8"
        width="30"
        height="18"
        rx="4"
        fill={idleFill}
        stroke={idleStroke}
        className={animate.jj ? 'tut-jjBtn' : undefined}
      />
      <text x="175" y="20" textAnchor="middle" fontSize="10" fill="var(--text-primary)" fontFamily="var(--font-mono)">JJ</text>
    </>
  );
};

const stepWire = {
  title: 'Step 1 — Draw a wire',
  body: (
    <>
      <p>
        Wire mode is off by default. Click the <b>Wire</b> button in the
        toolbar, then click on the canvas to drop a vertex. Click again to
        extend — each click snaps to the grid.
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
        Tip: hold <b>Shift</b> for free placement, <b>Esc</b> to stop the chain.
      </p>
    </>
  ),
  anim: (
    <svg width="280" height="140" viewBox="0 0 280 140">
      <MockToolbar animate={{ wire: true }} />
      <path d="M40 80 L120 80" className="tut-wire1" />
      <path d="M120 80 L200 80" className="tut-wire2" />
      <Vertex cx={40} cy={80} />
      <Vertex cx={120} cy={80} />
      <Vertex cx={200} cy={80} />
      <circle cx={68} cy={17} r="4" className="tut-pulse tut-pulseTool" />
      <circle cx={40} cy={80} r="4" className="tut-pulse tut-pulseA" />
      <circle cx={120} cy={80} r="4" className="tut-pulse tut-pulseB" />
      <circle cx={200} cy={80} r="4" className="tut-pulse tut-pulseC" />
      <Cursor className="tut-cursor-AB" />
    </svg>
  ),
};

const stepComponent = {
  title: 'Step 2 — Drop components',
  body: (
    <>
      <p>
        Pick <b>C</b>, <b>L</b>, or <b>JJ</b> from the toolbar, then click on a
        wire to insert that element. Switch tools at any time to drop a
        different component on the same wire.
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
        Components magnetically snap to ¼, ⅓, ½, ⅔, ¾ along the wire. Click off
        any wire to drop a free-standing component instead.
      </p>
    </>
  ),
  anim: (
    <svg width="280" height="140" viewBox="0 0 280 140">
      <MockToolbar animate={{ C: true, jj: true }} />
      <line x1="40" y1="90" x2="220" y2="90" stroke="var(--wire-color)" strokeWidth="2.5" />
      <Vertex cx={40} cy={90} />
      <Vertex cx={220} cy={90} />
      <g className="tut-comp">
        <Capacitor x={90} y={90} />
      </g>
      <g className="tut-comp2">
        <JJ x={160} y={90} />
      </g>
      <circle cx={109} cy={17} r="4" className="tut-pulse tut-pulseToolC" />
      <circle cx={90} cy={90} r="4" className="tut-pulse tut-pulseCL" />
      <circle cx={175} cy={17} r="4" className="tut-pulse tut-pulseToolJ" />
      <circle cx={160} cy={90} r="4" className="tut-pulse tut-pulseJJ" />
      <Cursor className="tut-cursor-CL" />
    </svg>
  ),
};

const stepSelect = {
  title: 'Step 3 — Select & edit',
  body: (
    <>
      <p>
        With no tool active, click any vertex, wire, or component to select it.
        The <b>right side panel</b> shows the properties — change the value, swap
        the type, or recolor.
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
        The left panel lists every electrical node and component — click a row to
        highlight it on the canvas.
      </p>
    </>
  ),
  anim: (
    <svg width="240" height="100" viewBox="0 0 240 100">
      <line x1="20" y1="38" x2="150" y2="38" stroke="var(--wire-color)" strokeWidth="2.5" />
      <Vertex cx={20} cy={38} />
      <Vertex cx={150} cy={38} />
      <g className="tut-compSel">
        <Capacitor x={85} y={38} />
      </g>
      <circle cx={85} cy={38} r="4" className="tut-pulse tut-pulseSel" />
      <Cursor className="tut-cursor-sel" />
      <g className="tut-panel">
        <rect
          x="160"
          y="10"
          width="70"
          height="80"
          rx="6"
          fill="var(--bg-card)"
          stroke="var(--border)"
        />
        <rect x="170" y="22" width="50" height="8" rx="2" fill="var(--accent-amber)" />
        <rect x="170" y="38" width="50" height="6" rx="2" fill="var(--text-muted)" />
        <rect x="170" y="50" width="50" height="6" rx="2" fill="var(--text-muted)" />
        <rect x="170" y="64" width="50" height="14" rx="3" fill="var(--bg-input)" stroke="var(--border)" />
      </g>
    </svg>
  ),
};

const stepDrag = {
  title: 'Step 4 — Drag, undo, pan & zoom',
  body: (
    <>
      <p>
        Drag any <b>vertex</b> to move it (the wires attached to it stretch with it),
        and drag any <b>component</b> to slide it along — drop on a wire to snap onto
        it. Mouse-wheel zooms; middle-drag (or Space + drag) pans.
      </p>
      <p>
        Made a mistake? <span style={kbd}>Ctrl</span>+<span style={kbd}>Z</span> undoes,
        <span style={kbd}>Ctrl</span>+<span style={kbd}>Shift</span>+<span style={kbd}>Z</span> redoes.
      </p>
    </>
  ),
  anim: (
    <svg width="280" height="150" viewBox="0 0 280 150">
      {/* Scene 1: dragging a vertex stretches the wire it owns. */}
      <text x="10" y="18" fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-mono)">
        DRAG A VERTEX
      </text>
      <path d="M40 30 L140 30" className="tut-wire-stretch" />
      <Vertex cx={40} cy={30} />
      <circle
        cy={30}
        r={5}
        fill="var(--bg-input)"
        stroke="var(--accent-blue)"
        strokeWidth="2"
        className="tut-vert-drag"
      />

      {/* Scene 2: dragging a component slides it along the wire. */}
      <text x="10" y="73" fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-mono)">
        DRAG A COMPONENT
      </text>
      <line x1="40" y1="85" x2="240" y2="85" stroke="var(--wire-color)" strokeWidth="2.5" />
      <Vertex cx={40} cy={85} />
      <Vertex cx={240} cy={85} />
      <g className="tut-comp-drag">
        <Capacitor x={0} y={0} />
      </g>

      {/* Undo chip — flashes when the vertex / component snap back. */}
      <g transform="translate(20,113)">
        <rect width="46" height="18" rx="4" className="tut-key-undo" />
        <text x="23" y="13" textAnchor="middle" fontSize="9" fill="var(--text-primary)" fontFamily="var(--font-mono)">
          Ctrl+Z
        </text>
      </g>

      <Cursor className="tut-cursor-drag" />
    </svg>
  ),
};

const stepBasicEnd = {
  title: "That's the basics!",
  body: (
    <>
      <p>
        You can now build any circuit. As your circuits get bigger, the advanced
        shortcuts below let you tile cells, mirror, and edit groups quickly.
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
        Want to see them now? You can also revisit the tutorial later from the{' '}
        <b>Help</b> button in the top bar.
      </p>
    </>
  ),
  anim: (
    <svg width="240" height="100" viewBox="0 0 240 100">
      <line x1="30" y1="50" x2="210" y2="50" stroke="var(--wire-color)" strokeWidth="2.5" />
      <Vertex cx={30} cy={50} />
      <Vertex cx={210} cy={50} />
      <Capacitor x={80} y={50} />
      <Inductor x={150} y={50} />
    </svg>
  ),
};

const stepMulti = {
  title: 'Multi-select',
  body: (
    <>
      <p>
        Hold <span style={kbd}>Shift</span> and click items to toggle them in or
        out of a selection.
      </p>
      <p>
        Or hold <span style={kbd}>Ctrl</span> and drag on empty canvas to box-select
        everything inside the rectangle. <span style={kbd}>Ctrl</span>+<span style={kbd}>Shift</span> adds
        to the existing selection.
      </p>
    </>
  ),
  anim: (
    <svg width="280" height="100" viewBox="0 0 280 100">
      <line x1="20" y1="40" x2="240" y2="40" stroke="var(--wire-color)" strokeWidth="2.5" />
      <Vertex cx={20} cy={40} />
      <g className="tut-sel1">
        <Capacitor x={80} y={40} />
      </g>
      <g className="tut-sel2">
        <Inductor x={180} y={40} />
      </g>
      <Vertex cx={240} cy={40} />
      <Cursor className="tut-cursor-shift" />
      <g transform="translate(20,75)">
        <rect width="40" height="18" rx="4" stroke="var(--border)" className="tut-shiftKey" />
        <text x="20" y="13" textAnchor="middle" fontSize="9" fill="var(--text-primary)" fontFamily="var(--font-mono)">Shift</text>
      </g>
    </svg>
  ),
};

const stepBox = {
  title: 'Box-select',
  body: (
    <p>
      Hold <span style={kbd}>Ctrl</span> and drag on empty canvas to draw a
      rectangle. Every vertex, wire, and component fully inside it is selected.
      Hold <span style={kbd}>Shift</span> as well to add to the existing selection.
    </p>
  ),
  anim: (
    <svg width="280" height="120" viewBox="0 0 280 120">
      <line x1="60" y1="50" x2="220" y2="50" stroke="var(--wire-color)" strokeWidth="2.5" />
      <Vertex cx={60} cy={50} />
      <Vertex cx={220} cy={50} />
      <g className="tut-boxSel">
        <Capacitor x={120} y={50} />
        <Inductor x={170} y={50} />
      </g>
      <rect x="40" y="30" rx="2" className="tut-box" />
      <Cursor className="tut-cursor-box" />
      <g transform="translate(20,98)">
        <rect width="40" height="18" rx="4" stroke="var(--border)" className="tut-ctrlKey" />
        <text x="20" y="13" textAnchor="middle" fontSize="9" fill="var(--text-primary)" fontFamily="var(--font-mono)">Ctrl</text>
      </g>
    </svg>
  ),
};

const stepCopy = {
  title: 'Copy & paste',
  body: (
    <>
      <p>
        With a selection active, <span style={kbd}>Ctrl</span>+<span style={kbd}>C</span>{' '}
        copies and <span style={kbd}>Ctrl</span>+<span style={kbd}>V</span> pastes.
      </p>
      <p>
        Successive pastes spread diagonally so they don't stack. Drop the
        duplicate next to the original and the matching vertices will fuse — this
        is how you tile unit cells.
      </p>
    </>
  ),
  anim: (
    <svg width="260" height="100" viewBox="0 0 260 100">
      <line x1="30" y1="40" x2="120" y2="40" stroke="var(--wire-color)" strokeWidth="2.5" />
      <Vertex cx={30} cy={40} />
      <Vertex cx={120} cy={40} />
      <Capacitor x={75} y={40} />
      <g className="tut-pasteBlock">
        <line x1="120" y1="40" x2="210" y2="40" stroke="var(--wire-color)" strokeWidth="2.5" />
        <Vertex cx={210} cy={40} />
        <Capacitor x={165} y={40} />
      </g>
      <g transform="translate(30,75)">
        <rect width="34" height="18" rx="4" stroke="var(--border)" className="tut-keyC" />
        <text x="17" y="13" textAnchor="middle" fontSize="9" fill="var(--text-primary)" fontFamily="var(--font-mono)">C</text>
      </g>
      <g transform="translate(74,75)">
        <rect width="34" height="18" rx="4" stroke="var(--border)" className="tut-keyV" />
        <text x="17" y="13" textAnchor="middle" fontSize="9" fill="var(--text-primary)" fontFamily="var(--font-mono)">V</text>
      </g>
    </svg>
  ),
};

const stepRotate = {
  title: 'Rotate the selection',
  body: (
    <p>
      <span style={kbd}>Ctrl</span>+<span style={kbd}>Q</span> rotates the
      selection 90° clockwise around its center. Hold{' '}
      <span style={kbd}>Shift</span> to rotate counter-clockwise.
    </p>
  ),
  anim: (
    <svg width="240" height="100" viewBox="0 0 240 100">
      <g className="tut-rotateGroup">
        <line x1="60" y1="50" x2="160" y2="50" stroke="var(--wire-color)" strokeWidth="2.5" />
        <Vertex cx={60} cy={50} />
        <Vertex cx={160} cy={50} />
        <Capacitor x={110} y={50} />
      </g>
    </svg>
  ),
};

const stepMirror = {
  title: 'Mirror the selection',
  body: (
    <p>
      <span style={kbd}>Ctrl</span>+<span style={kbd}>M</span> mirrors the
      selection horizontally; <span style={kbd}>Ctrl</span>+<span style={kbd}>Shift</span>+<span style={kbd}>M</span>{' '}
      mirrors it vertically.
    </p>
  ),
  anim: (
    <svg width="240" height="100" viewBox="0 0 240 100">
      <g className="tut-mirrorGroup">
        <line x1="60" y1="50" x2="160" y2="50" stroke="var(--wire-color)" strokeWidth="2.5" />
        <Vertex cx={60} cy={50} />
        <Vertex cx={160} cy={50} />
        <Inductor x={110} y={50} />
        <text x="80" y="70" fontSize="11" fill="var(--text-muted)" fontFamily="var(--font-mono)">L₁</text>
      </g>
    </svg>
  ),
};

const stepMerge = {
  title: 'Merging vertices',
  body: (
    <>
      <p>
        Drag a vertex onto another and they fuse on release. The same happens
        when a multi-selection is dragged near a coincident vertex — components
        glue together cleanly.
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
        Need to merge a vertex into a passing wire? Select it and use the{' '}
        <b>Merge into wire</b> button on the right.
      </p>
    </>
  ),
  anim: (
    <svg width="240" height="100" viewBox="0 0 240 100">
      <line x1="60" y1="30" x2="60" y2="30" stroke="var(--wire-color)" strokeWidth="2.5" />
      <line x1="150" y1="30" x2="220" y2="30" stroke="var(--wire-color)" strokeWidth="2.5" />
      <circle cy={30} r={5} fill="var(--bg-input)" strokeWidth="2.5" stroke="var(--accent-blue)" className="tut-mergeVert" />
      <circle cx={150} cy={30} r={5} fill="var(--bg-input)" strokeWidth="2.5" className="tut-mergeTarget" />
      <Vertex cx={220} cy={30} />
      <Cursor className="tut-cursor-merge" />
    </svg>
  ),
};

const stepEnd = {
  title: "You're all set!",
  body: (
    <>
      <p>
        That covers everything. You can revisit this tutorial any time from the{' '}
        <b>Help</b> button in the top bar, where you'll also find a complete
        keyboard reference.
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
        Happy circuit-building.
      </p>
    </>
  ),
  anim: (
    <svg width="260" height="100" viewBox="0 0 260 100">
      <line x1="30" y1="50" x2="230" y2="50" stroke="var(--wire-color)" strokeWidth="2.5" />
      <Vertex cx={30} cy={50} />
      <Vertex cx={230} cy={50} />
      <Capacitor x={80} y={50} />
      <Inductor x={150} y={50} />
      <g transform="translate(195,38)">
        <line x1="-10" y1="12" x2="10" y2="-12" stroke="var(--accent-amber)" strokeWidth="2" />
        <line x1="-10" y1="-12" x2="10" y2="12" stroke="var(--accent-amber)" strokeWidth="2" />
      </g>
    </svg>
  ),
};

const BASIC_STEPS = [stepWelcome, stepWire, stepComponent, stepSelect, stepDrag, stepBasicEnd];
const ADVANCED_STEPS = [stepMulti, stepBox, stepCopy, stepRotate, stepMirror, stepMerge, stepEnd];

/* -------------------------------- styles -------------------------------- */

const backdropStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  padding: 24,
};

const cardStyle = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  width: 'min(560px, 100%)',
  display: 'flex',
  flexDirection: 'column',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 18px',
  borderBottom: '1px solid var(--border)',
};

const titleStyle = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 0.8,
  color: 'var(--accent-amber)',
};

const counterStyle = {
  fontSize: 11,
  color: 'var(--text-muted)',
};

const closeBtnStyle = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  width: 26,
  height: 26,
  fontSize: 14,
  fontFamily: 'inherit',
  lineHeight: 1,
  marginLeft: 8,
};

const animBoxStyle = {
  background: 'var(--bg-secondary)',
  borderTop: '1px solid var(--border)',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '14px 16px',
  minHeight: 120,
};

const stepHeading = {
  fontSize: 14,
  fontWeight: 700,
  margin: '4px 0 8px',
  color: 'var(--text-primary)',
};

const bodyStyle = {
  padding: '14px 18px',
  fontSize: 12.5,
  color: 'var(--text-secondary)',
  lineHeight: 1.55,
};

const footerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 18px',
  borderTop: '1px solid var(--border)',
  flexWrap: 'wrap',
};

const ghostBtn = {
  padding: '6px 14px',
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text-secondary)',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const primaryBtn = {
  padding: '6px 14px',
  background: 'var(--accent-amber)',
  border: 'none',
  borderRadius: 6,
  color: '#000',
  fontWeight: 600,
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const checkRowStyle = {
  fontSize: 11,
  color: 'var(--text-muted)',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginRight: 'auto',
  cursor: 'pointer',
  userSelect: 'none',
};

/* ------------------------------- component ------------------------------ */

export default function Tutorial({ open, onClose, onDismissForever }) {
  const [track, setTrack] = useState('basic');
  const [index, setIndex] = useState(0);
  const [dontShow, setDontShow] = useState(false);

  // Reset to the first basic step every time the tutorial opens — so a
  // user who relaunches it from the Help modal mid-stream starts fresh.
  useEffect(() => {
    if (open) {
      setTrack('basic');
      setIndex(0);
      setDontShow(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handleBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, track, index, dontShow]);

  if (!open) return null;

  const steps = track === 'basic' ? BASIC_STEPS : ADVANCED_STEPS;
  const step = steps[index];
  const isLastBasic = track === 'basic' && index === BASIC_STEPS.length - 1;
  const isLastAdvanced = track === 'advanced' && index === ADVANCED_STEPS.length - 1;

  const handleClose = () => {
    if (dontShow) onDismissForever?.();
    onClose?.();
  };

  const handleNext = () => {
    if (isLastBasic) return; // basic-end footer drives that branch
    if (isLastAdvanced) {
      handleClose();
      return;
    }
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const handleBack = () => {
    if (index === 0 && track === 'advanced') {
      // Reverse back into the basic track at the basic-end step.
      setTrack('basic');
      setIndex(BASIC_STEPS.length - 1);
      return;
    }
    setIndex((i) => Math.max(i - 1, 0));
  };

  const startAdvanced = () => {
    setTrack('advanced');
    setIndex(0);
  };

  return (
    <div style={backdropStyle} onClick={handleClose}>
      <style>{ANIM_CSS}</style>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={titleStyle}>
            {track === 'basic' ? 'TUTORIAL — BASICS' : 'TUTORIAL — ADVANCED'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={counterStyle}>
              {index + 1} / {steps.length}
            </span>
            <button style={closeBtnStyle} onClick={handleClose} aria-label="Close tutorial">
              ×
            </button>
          </div>
        </div>

        <div style={animBoxStyle}>{step.anim}</div>

        <div style={bodyStyle}>
          <div style={stepHeading}>{step.title}</div>
          {step.body}
        </div>

        <div style={footerStyle}>
          <label style={checkRowStyle}>
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
            />
            Don't show again
          </label>

          <button style={ghostBtn} onClick={handleClose}>
            {isLastAdvanced || isLastBasic ? 'Close' : 'Skip'}
          </button>

          <button
            style={{ ...ghostBtn, opacity: index === 0 && track === 'basic' ? 0.4 : 1 }}
            onClick={handleBack}
            disabled={index === 0 && track === 'basic'}
          >
            ← Back
          </button>

          {isLastBasic ? (
            <>
              <button style={ghostBtn} onClick={handleClose}>
                Finish
              </button>
              <button style={primaryBtn} onClick={startAdvanced}>
                Show advanced →
              </button>
            </>
          ) : isLastAdvanced ? (
            <button style={primaryBtn} onClick={handleClose}>
              Finish
            </button>
          ) : (
            <button style={primaryBtn} onClick={handleNext}>
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
