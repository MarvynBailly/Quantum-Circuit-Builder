import React, { useState } from 'react';
import { ELEMENT_TYPES } from '../circuit/index.js';

// HTML5 drag-and-drop key used to identify reorder events that
// originate inside this panel. Distinguishes a node-row drag from a
// component-row drag so the two lists don't accept each other's drops.
const DRAG_MIME_NODE = 'application/x-qcb-reorder-node';
const DRAG_MIME_COMP = 'application/x-qcb-reorder-component';

const dragRowStyle = {
  cursor: 'grab',
  userSelect: 'none',
};

/** Visual cue when a row is being dragged or hovered as a drop target. */
function rowDragStyle(isDragging, dropPosition) {
  const base = {};
  if (isDragging) base.opacity = 0.4;
  if (dropPosition === 'before') {
    base.boxShadow = 'inset 0 2px 0 var(--accent-amber)';
  } else if (dropPosition === 'after') {
    base.boxShadow = 'inset 0 -2px 0 var(--accent-amber)';
  }
  return base;
}

/** Compute which half of the row the cursor is on, so the drop lands
 *  before vs. after the target row. */
function dropPositionFromEvent(e, rect) {
  const y = e.clientY - rect.top;
  return y < rect.height / 2 ? 'before' : 'after';
}

const baseInputStyle = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '4px 6px',
  fontFamily: 'var(--font-mono)',
  fontSize: 14,
  minWidth: 0,
  width: '100%',
};

const colorSwatchStyle = {
  width: 22,
  height: 22,
  padding: 0,
  border: '1px solid var(--border)',
  borderRadius: 4,
  background: 'transparent',
  cursor: 'pointer',
};

const iconButtonStyle = {
  width: 22,
  height: 22,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 4,
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: 11,
  padding: 0,
};

const groupChevronStyle = {
  width: 18,
  height: 18,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: 10,
  padding: 0,
};

const collapsedLabelStyle = {
  marginTop: 12,
  color: 'var(--text-secondary)',
  fontSize: 10,
  letterSpacing: 1,
  fontWeight: 600,
  writingMode: 'vertical-rl',
};

/**
 * Left-side panel listing every electrical node and component, with
 * matching coloring / labeling controls. Each group (Electrical Nodes,
 * Capacitors, Inductors, JJs) is independently foldable, and the whole
 * panel can collapse to a thin strip via the parent's collapse toggle.
 *
 * Per-group "auto-label" buttons reset that section's labels to a
 * clean sequential set (\phi_{0..}, C_{0..}, L_{0..}, E_J^{0..}) — useful
 * after a stretch of editing leaves the symbols sparse / unordered.
 */
function NodeLabelsPanel({
  nodes,
  onUpdateNode,
  components,
  onUpdateComponent,
  width = 380,
  onResizeStart,
  highlightedNodeId = null,
  highlightedComponentId = null,
  onHighlightNode,
  onFocusItem,
  onBlurItem,
  onSetAllNodeColors,
  onSetAllComponentColorsOfType,
  onSetAllComponentColors,
  onRelabelAllNodes,
  onRelabelComponentsOfType,
  hideGroundedLabels = false,
  onToggleHideGroundedLabels,
  hideVertexDots = false,
  onToggleHideVertexDots,
  onReorderNodes,
  onReorderComponentsOfType,
  collapsed = false,
  onToggleCollapsed,
}) {
  const [openGroups, setOpenGroups] = useState({
    nodes: true,
    C: true,
    L: true,
    JJ: true,
  });
  const toggleGroup = (key) => setOpenGroups((g) => ({ ...g, [key]: !g[key] }));

  // { kind: 'node' | 'component', typeKey?, index } during drag.
  const [dragInfo, setDragInfo] = useState(null);
  // { kind, typeKey?, index, position } for the row currently under
  // the cursor, so it shows the drop indicator.
  const [dropTarget, setDropTarget] = useState(null);

  const startDrag = (kind, typeKey, index) => (e) => {
    setDragInfo({ kind, typeKey, index });
    setDropTarget(null);
    const mime = kind === 'node' ? DRAG_MIME_NODE : DRAG_MIME_COMP;
    e.dataTransfer.effectAllowed = 'move';
    // The payload encodes the source so a drop can validate same-list
    // (a JJ row dropped on a C row is rejected).
    e.dataTransfer.setData(mime, JSON.stringify({ typeKey, index }));
  };

  const onDragOverRow = (kind, typeKey, index) => (e) => {
    if (!dragInfo || dragInfo.kind !== kind) return;
    if (kind === 'component' && dragInfo.typeKey !== typeKey) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    setDropTarget({ kind, typeKey, index, position: dropPositionFromEvent(e, rect) });
  };

  const onDropRow = (kind, typeKey, index) => (e) => {
    if (!dragInfo || dragInfo.kind !== kind) return;
    if (kind === 'component' && dragInfo.typeKey !== typeKey) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const position = dropPositionFromEvent(e, rect);
    let to = position === 'before' ? index : index + 1;
    if (dragInfo.index < to) to -= 1;
    if (kind === 'node' && onReorderNodes) onReorderNodes(dragInfo.index, to);
    if (kind === 'component' && onReorderComponentsOfType) {
      onReorderComponentsOfType(typeKey, dragInfo.index, to);
    }
    setDragInfo(null);
    setDropTarget(null);
  };

  const onDragEnd = () => {
    setDragInfo(null);
    setDropTarget(null);
  };

  const focusNode = (id) => onFocusItem?.('node', id);
  const focusComponent = (id) => onFocusItem?.('component', id);
  const blurItem = () => onBlurItem?.();

  if (collapsed) {
    return (
      <div
        style={{
          width: 28,
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-panel)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 12,
        }}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          title="Expand circuit labels"
          style={iconButtonStyle}
        >
          ▶
        </button>
        <div style={collapsedLabelStyle}>CIRCUIT LABELS</div>
      </div>
    );
  }

  return (
    <div
      style={{
        width,
        borderRight: '1px solid var(--border)',
        padding: 20,
        overflowY: 'auto',
        background: 'var(--bg-panel)',
        fontSize: 12,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <div
        onMouseDown={onResizeStart}
        title="Drag to resize"
        style={{
          position: 'absolute',
          top: 0,
          right: -3,
          width: 6,
          height: '100%',
          cursor: 'col-resize',
          zIndex: 10,
          background: 'transparent',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontWeight: 600,
            color: 'var(--accent-amber)',
            fontSize: 11,
            letterSpacing: 1,
            flex: 1,
          }}
        >
          CIRCUIT LABELS
        </div>
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            title="Collapse panel"
            style={iconButtonStyle}
          >
            ◀
          </button>
        )}
      </div>

      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 8,
          }}
        >
          <button
            type="button"
            onClick={() => toggleGroup('nodes')}
            title={openGroups.nodes ? 'Collapse group' : 'Expand group'}
            style={groupChevronStyle}
          >
            {openGroups.nodes ? '▼' : '▶'}
          </button>
          <div
            style={{
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: 0.5,
              flex: 1,
              cursor: 'pointer',
              userSelect: 'none',
            }}
            onClick={() => toggleGroup('nodes')}
          >
            ELECTRICAL NODES
            {nodes.length > 0 && (
              <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>
                ({nodes.length})
              </span>
            )}
          </div>
          {onToggleHideGroundedLabels && (
            <button
              type="button"
              onClick={onToggleHideGroundedLabels}
              title={
                hideGroundedLabels
                  ? 'Show on-canvas labels for grounded nodes'
                  : 'Hide on-canvas labels for grounded nodes'
              }
              style={{
                ...iconButtonStyle,
                background: hideGroundedLabels ? 'var(--bg-input)' : 'transparent',
                color: hideGroundedLabels ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              ⏚
            </button>
          )}
          {onToggleHideVertexDots && (
            <button
              type="button"
              onClick={onToggleHideVertexDots}
              title={
                hideVertexDots
                  ? 'Show vertex dots on the canvas'
                  : 'Hide vertex dots on the canvas (interaction feedback stays)'
              }
              style={{
                ...iconButtonStyle,
                background: hideVertexDots ? 'var(--bg-input)' : 'transparent',
                color: hideVertexDots ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              ●
            </button>
          )}
          {onRelabelAllNodes && nodes.length > 0 && (
            <button
              type="button"
              onClick={onRelabelAllNodes}
              title="Reset all node labels to \phi_{0..N-1}"
              style={iconButtonStyle}
            >
              ↺
            </button>
          )}
          {onSetAllNodeColors && nodes.length > 0 && (
            <input
              type="color"
              value={nodes[0].color || '#888888'}
              onChange={(e) => onSetAllNodeColors(e.target.value)}
              title="Set color for all nodes"
              style={colorSwatchStyle}
            />
          )}
        </div>
        {openGroups.nodes && (
          <div style={{ overflowX: 'auto' }}>
            {nodes.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                No nodes yet. Lay down wires and components — nodes are detected automatically.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
                {nodes.map((n, idx) => {
                  const isHighlighted = highlightedNodeId === n.id;
                  const isDragSrc = dragInfo?.kind === 'node' && dragInfo.index === idx;
                  const dropPos =
                    dropTarget?.kind === 'node' && dropTarget.index === idx
                      ? dropTarget.position
                      : null;
                  const dragStyleFor = onReorderNodes ? rowDragStyle(isDragSrc, dropPos) : null;
                  const baseShadow = isHighlighted
                    ? `inset 3px 0 0 ${n.color || 'var(--accent-blue)'}`
                    : 'none';
                  return (
                    <div
                      key={n.id}
                      onDragOver={onReorderNodes ? onDragOverRow('node', null, idx) : undefined}
                      onDrop={onReorderNodes ? onDropRow('node', null, idx) : undefined}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: onReorderNodes
                          ? '14px 22px minmax(0, 1fr) 22px'
                          : '22px minmax(0, 1fr) 22px',
                        alignItems: 'center',
                        gap: 6,
                        padding: '2px 4px',
                        borderRadius: 4,
                        background: isHighlighted ? 'var(--bg-input)' : 'transparent',
                        ...(dragStyleFor ?? {}),
                        // Highlight ring beats the drop indicator only
                        // when no drop is currently targeting this row.
                        boxShadow:
                          dragStyleFor?.boxShadow ?? baseShadow,
                        opacity: dragStyleFor?.opacity ?? 1,
                      }}
                    >
                      {onReorderNodes && (
                        <span
                          draggable
                          onDragStart={startDrag('node', null, idx)}
                          onDragEnd={onDragEnd}
                          title="Drag to reorder"
                          style={{
                            ...dragRowStyle,
                            color: 'var(--text-muted)',
                            fontSize: 12,
                            textAlign: 'center',
                          }}
                        >
                          ⋮⋮
                        </span>
                      )}
                      {n.color !== undefined ? (
                        <input
                          type="color"
                          value={n.color}
                          onChange={(e) => onUpdateNode(n.id, { color: e.target.value })}
                          onFocus={() => focusNode(n.id)}
                          onBlur={blurItem}
                          title="Node color"
                          style={colorSwatchStyle}
                        />
                      ) : (
                        <span />
                      )}
                      <input
                        value={n.label}
                        onChange={(e) => onUpdateNode(n.id, { label: e.target.value })}
                        onFocus={() => focusNode(n.id)}
                        onBlur={blurItem}
                        placeholder="auto"
                        style={{
                          ...baseInputStyle,
                          color: n.userLabel ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontStyle: n.userLabel ? 'normal' : 'italic',
                        }}
                      />
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          color: n.isGround ? 'var(--text-secondary)' : 'transparent',
                          width: 18,
                          userSelect: 'none',
                        }}
                        title={n.isGround ? 'Grounded — click the ⏚ glyph on the canvas and press Delete to remove' : ''}
                      >
                        ⏚
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {components && (
        <section style={{ marginTop: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                color: 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: 0.5,
                flex: 1,
              }}
            >
              COMPONENTS
            </div>
            {onSetAllComponentColors && components.length > 0 && (
              <input
                type="color"
                value={components[0].color || '#888888'}
                onChange={(e) => onSetAllComponentColors(e.target.value)}
                title="Set the same color for every component"
                style={colorSwatchStyle}
              />
            )}
          </div>
          {components.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              No components yet. Pick C / L / JJ from the toolbar and click on a wire.
            </div>
          ) : (
            ['C', 'L', 'JJ'].map((typeKey) => {
              const ofType = components.filter((c) => c.type === typeKey);
              if (ofType.length === 0) return null;
              const info = ELEMENT_TYPES[typeKey];
              const groupColor = ofType[0].color || info.color;
              const isOpen = !!openGroups[typeKey];
              return (
                <div key={typeKey} style={{ marginTop: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 6,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroup(typeKey)}
                      title={isOpen ? 'Collapse group' : 'Expand group'}
                      style={groupChevronStyle}
                    >
                      {isOpen ? '▼' : '▶'}
                    </button>
                    <div
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: 11,
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                        flex: 1,
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                      onClick={() => toggleGroup(typeKey)}
                    >
                      {info.label}
                      <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                        ({ofType.length})
                      </span>
                    </div>
                    {onRelabelComponentsOfType && (
                      <button
                        type="button"
                        onClick={() => onRelabelComponentsOfType(typeKey)}
                        title={`Renumber ${info.label.toLowerCase()}s sequentially`}
                        style={iconButtonStyle}
                      >
                        ↺
                      </button>
                    )}
                    {onSetAllComponentColorsOfType && (
                      <input
                        type="color"
                        value={groupColor}
                        onChange={(e) =>
                          onSetAllComponentColorsOfType(typeKey, e.target.value)
                        }
                        title={`Set color for all ${info.label.toLowerCase()}`}
                        style={colorSwatchStyle}
                      />
                    )}
                  </div>
                  {isOpen && (
                    <div style={{ overflowX: 'auto' }}>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          minWidth: 220,
                        }}
                      >
                        {ofType.map((c, idx) => {
                          const color = c.color || info.color;
                          const isHighlighted = highlightedComponentId === c.id;
                          const isDragSrc =
                            dragInfo?.kind === 'component' &&
                            dragInfo.typeKey === typeKey &&
                            dragInfo.index === idx;
                          const dropPos =
                            dropTarget?.kind === 'component' &&
                            dropTarget.typeKey === typeKey &&
                            dropTarget.index === idx
                              ? dropTarget.position
                              : null;
                          const dragStyleFor = onReorderComponentsOfType
                            ? rowDragStyle(isDragSrc, dropPos)
                            : null;
                          const baseShadow = isHighlighted
                            ? `inset 3px 0 0 ${color}`
                            : 'none';
                          return (
                            <div
                              key={c.id}
                              onDragOver={
                                onReorderComponentsOfType
                                  ? onDragOverRow('component', typeKey, idx)
                                  : undefined
                              }
                              onDrop={
                                onReorderComponentsOfType
                                  ? onDropRow('component', typeKey, idx)
                                  : undefined
                              }
                              style={{
                                display: 'grid',
                                gridTemplateColumns: onReorderComponentsOfType
                                  ? '14px auto 22px minmax(0, 1fr)'
                                  : 'auto 22px minmax(0, 1fr)',
                                alignItems: 'center',
                                gap: 6,
                                padding: '2px 4px',
                                borderRadius: 4,
                                background: isHighlighted ? 'var(--bg-input)' : 'transparent',
                                ...(dragStyleFor ?? {}),
                                boxShadow: dragStyleFor?.boxShadow ?? baseShadow,
                                opacity: dragStyleFor?.opacity ?? 1,
                              }}
                            >
                              {onReorderComponentsOfType && (
                                <span
                                  draggable
                                  onDragStart={startDrag('component', typeKey, idx)}
                                  onDragEnd={onDragEnd}
                                  title="Drag to reorder"
                                  style={{
                                    ...dragRowStyle,
                                    color: 'var(--text-muted)',
                                    fontSize: 12,
                                    textAlign: 'center',
                                  }}
                                >
                                  ⋮⋮
                                </span>
                              )}
                              <span
                                style={{
                                  color: 'var(--text-muted)',
                                  fontSize: 13,
                                  minWidth: 24,
                                  textAlign: 'right',
                                }}
                                title={info.label}
                              >
                                {info.symbol}
                              </span>
                              <input
                                type="color"
                                value={color}
                                onChange={(e) =>
                                  onUpdateComponent(c.id, { color: e.target.value })
                                }
                                onFocus={() => focusComponent(c.id)}
                                onBlur={blurItem}
                                title="Component color"
                                style={colorSwatchStyle}
                              />
                              <input
                                value={String(c.value ?? '')}
                                onChange={(e) =>
                                  onUpdateComponent(c.id, { value: e.target.value })
                                }
                                onFocus={() => focusComponent(c.id)}
                                onBlur={blurItem}
                                placeholder={`${info.symbol}_{i}`}
                                style={{ ...baseInputStyle, color: 'var(--text-primary)' }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      )}
    </div>
  );
}

export default React.memo(NodeLabelsPanel);
