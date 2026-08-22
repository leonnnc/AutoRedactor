import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { Slide, CanvasElement, SlideBackground, ViewportMode, CustomCanvasSize } from '../types';
import { getViewportDimensions } from '../utils/captureSlide';
import { calcTextBoxH } from '../utils/parseSermon';
import { Bold, Italic, Type, AlignLeft, AlignCenter, AlignRight, Trash2, Plus, Minus, GripVertical, GripHorizontal, Ruler } from 'lucide-react';
import { HorizontalRuler, VerticalRuler } from './Ruler';

const FONTS = [
  { label: 'Playfair',  value: "'Playfair Display', serif" },
  { label: 'Inter',     value: "'Inter', sans-serif" },
  { label: 'Montserrat',value: "'Montserrat', sans-serif" },
  { label: 'Lora',      value: "'Lora', serif" },
  { label: 'Cinzel',    value: "'Cinzel', serif" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface DragState {
  type: 'move' | 'resize';
  handle?: ResizeHandle;
  startMouseX: number;
  startMouseY: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  startFontSize: number;
  canvasW: number;
  canvasH: number;
  fullW: number;   // full-resolution width (e.g. 1920)
  fullH: number;   // full-resolution height (e.g. 1080)
}

interface CanvasEditorProps {
  slide: Slide;
  selectedId: string | null;
  viewportMode: ViewportMode;
  customCanvas?: CustomCanvasSize;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, fields: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onUpdateBackground?: (fields: Partial<SlideBackground>) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const getPreviewDimensions = (mode: ViewportMode, custom?: CustomCanvasSize) => {
  const base = getViewportDimensions(mode, custom);
  if (mode === 'custom' && custom) {
    const maxW = 960;
    const scale = Math.min(1, maxW / custom.width);
    return { ...base, scale };
  }
  return base;
};


const buildSlideStyle = (bg: SlideBackground): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
  };
  if (bg.backgroundType === 'solid') return { ...base, backgroundColor: bg.backgroundColor };
  if (bg.backgroundType === 'gradient') return { ...base, background: bg.backgroundGradient };
  if (bg.backgroundType === 'image' && bg.backgroundImage) {
    if (bg.bgBlur === 0) {
      return {
        ...base,
        backgroundImage: `url(${bg.backgroundImage})`,
        backgroundSize: bg.bgSize,
        backgroundPosition: bg.bgPosition,
        backgroundRepeat: 'no-repeat',
      };
    }
    // blur handled by a child div
    return base;
  }
  return { ...base, backgroundColor: '#0f172a' };
};

/** Build the CSS style for the second (split) background panel. */
export const buildSplitPanelStyle = (bg: SlideBackground): React.CSSProperties => {
  const pos = bg.splitPosition ?? 50;
  const dir = bg.splitDirection ?? 'vertical';
  const dividerStyle = bg.splitDividerStyle ?? 'none';
  const angle = bg.splitAngle ?? 0;
  const isVertical = dir === 'vertical';

  const base: React.CSSProperties = {
    position: 'absolute',
    zIndex: 0,
  };

  if (dividerStyle === 'diagonal') {
    base.inset = 0;
    if (isVertical) {
      const topOffset = Math.max(0, Math.min(100, pos - angle));
      const bottomOffset = Math.max(0, Math.min(100, pos + angle));
      base.clipPath = `polygon(${topOffset}% 0%, 100% 0%, 100% 100%, ${bottomOffset}% 100%)`;
    } else {
      const leftOffset = Math.max(0, Math.min(100, pos - angle));
      const rightOffset = Math.max(0, Math.min(100, pos + angle));
      base.clipPath = `polygon(0% ${leftOffset}%, 100% ${rightOffset}%, 100% 100%, 0% 100%)`;
    }
  } else {
    if (isVertical) {
      base.top = 0;
      base.bottom = 0;
      base.left = `${pos}%`;
      base.right = 0;
    } else {
      base.left = 0;
      base.right = 0;
      base.top = `${pos}%`;
      base.bottom = 0;
    }

    if (dividerStyle === 'shadow') {
      base.boxShadow = isVertical
        ? '-16px 0 32px rgba(0, 0, 0, 0.65)'
        : '0 -16px 32px rgba(0, 0, 0, 0.65)';
    } else if (dividerStyle === 'border') {
      const bColor = bg.splitBorderColor ?? '#ffffff';
      const bWidth = bg.splitBorderWidth ?? 2;
      if (isVertical) {
        base.borderLeft = `${bWidth}px solid ${bColor}`;
      } else {
        base.borderTop = `${bWidth}px solid ${bColor}`;
      }
    } else if (dividerStyle === 'feather') {
      base.WebkitMaskImage = isVertical
        ? 'linear-gradient(to right, transparent 0%, black 18%, black 100%)'
        : 'linear-gradient(to bottom, transparent 0%, black 18%, black 100%)';
      base.maskImage = isVertical
        ? 'linear-gradient(to right, transparent 0%, black 18%, black 100%)'
        : 'linear-gradient(to bottom, transparent 0%, black 18%, black 100%)';
    }
  }

  const type = bg.splitBackgroundType ?? 'solid';
  if (type === 'solid') {
    base.backgroundColor = bg.splitBackgroundColor ?? '#1e293b';
  } else if (type === 'gradient') {
    base.background = bg.splitBackgroundGradient ?? 'linear-gradient(135deg, #0f172a, #1e3a5f)';
  } else if (type === 'image' && bg.splitBackgroundImage) {
    base.backgroundImage = `url(${bg.splitBackgroundImage})`;
    base.backgroundSize = bg.splitBgSize ?? 'cover';
    base.backgroundPosition = bg.splitBgPosition ?? 'center';
    base.backgroundRepeat = 'no-repeat';
    if ((bg.splitBgBlur ?? 0) > 0) {
      base.filter = `blur(${bg.splitBgBlur}px)`;
    }
  } else {
    base.backgroundColor = bg.splitBackgroundColor ?? '#1e293b';
  }

  return base;
};



// ─── Resize handle positions ──────────────────────────────────────────────────

const HANDLES: { id: ResizeHandle; cursor: string; top: string; left: string; transform: string }[] = [
  { id: 'nw', cursor: 'nw-resize', top: '0',   left: '0',   transform: 'translate(-50%,-50%)' },
  { id: 'n',  cursor: 'n-resize',  top: '0',   left: '50%', transform: 'translate(-50%,-50%)' },
  { id: 'ne', cursor: 'ne-resize', top: '0',   left: '100%',transform: 'translate(-50%,-50%)' },
  { id: 'e',  cursor: 'e-resize',  top: '50%', left: '100%',transform: 'translate(-50%,-50%)' },
  { id: 'se', cursor: 'se-resize', top: '100%',left: '100%',transform: 'translate(-50%,-50%)' },
  { id: 's',  cursor: 's-resize',  top: '100%',left: '50%', transform: 'translate(-50%,-50%)' },
  { id: 'sw', cursor: 'sw-resize', top: '100%',left: '0',   transform: 'translate(-50%,-50%)' },
  { id: 'w',  cursor: 'w-resize',  top: '50%', left: '0',   transform: 'translate(-50%,-50%)' },
];

// ─── Single element on canvas ─────────────────────────────────────────────────

const CanvasElementNode: React.FC<{
  el: CanvasElement;
  isSelected: boolean;
  scale: number;
  canvasW: number;
  canvasH: number;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent, type: 'move', handle?: ResizeHandle) => void;
  onResizeStart: (e: React.MouseEvent, handle: ResizeHandle) => void;
  onCommitText: (text: string) => void;
  onFitToText: (w: number, h: number) => void;
  shadowColor: string;
  shadowBlur: number;
}> = ({ el, isSelected, canvasW, canvasH, onSelect, onDragStart, onResizeStart, onCommitText, onFitToText, shadowColor, shadowBlur }) => {
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textDivRef = useRef<HTMLDivElement>(null);
  const fittedRef = useRef(false); // true after first auto-fit

  const PAD_PX = 6;

  // Auto-fit ONCE after first paint to get real browser dimensions
  useEffect(() => {
    if (fittedRef.current || editing || !textDivRef.current) return;
    const rect = textDivRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    fittedRef.current = true;
    const newW = Math.min(95, Math.max(5, ((rect.width  + PAD_PX * 2) / canvasW) * 100));
    const newH = Math.min(95, Math.max(2, ((rect.height + PAD_PX * 2) / canvasH) * 100));
    if (Math.abs(newW - el.w) > 0.3 || Math.abs(newH - el.h) > 0.3) {
      onFitToText(newW, newH);
    }
  });

  // Re-fit when fontSize changes (reset the flag so next render re-measures)
  const prevFontSize = useRef(el.fontSize);
  if (prevFontSize.current !== el.fontSize) {
    prevFontSize.current = el.fontSize;
    fittedRef.current = false;
  }  const shadowStr = el.textShadow
    ? `0 ${shadowBlur}px ${shadowBlur * 2}px ${shadowColor}`
    : undefined;

  const textStyle: React.CSSProperties = {
    color: el.color,
    fontSize: `${el.fontSize}px`,
    fontFamily: el.fontFamily,
    fontWeight: el.bold ? '700' : '400',
    fontStyle: el.italic ? 'italic' : 'normal',
    textTransform: el.uppercase ? 'uppercase' : 'none',
    textAlign: el.textAlign,
    lineHeight: el.lineHeight,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    width: '100%',
    opacity: el.opacity,
    ...(el.rotation !== 0 ? { transform: `rotate(${el.rotation}deg)` } : {}),
    ...(shadowStr ? { textShadow: shadowStr } : {}),
    ...(el.isReference ? { letterSpacing: '1px', fontWeight: '600' } : {}),
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }, 20);
  };

  const handleBlur = () => {
    setEditing(false);
    if (textareaRef.current) onCommitText(textareaRef.current.value);
  };

  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${el.x}%`,
    top: `${el.y}%`,
    width: `${el.w}%`,
    height: `${el.h}%`,
    boxSizing: 'border-box',
    padding: `${PAD_PX}px`,
    cursor: isSelected ? 'move' : 'pointer',
    userSelect: 'none',
    outline: isSelected ? `1px solid rgba(99,102,241,0.7)` : 'none',
    outlineOffset: '2px',
    overflow: 'hidden',
  };

  return (
    <div
      style={wrapperStyle}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect();
        if (!editing) onDragStart(e, 'move');
      }}
      onDoubleClick={handleDoubleClick}
    >
      {editing ? (
        <textarea
          ref={textareaRef}
          defaultValue={el.text}
          onBlur={handleBlur}
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }}
          style={{
            width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.5)',
            border: '2px solid #6366f1', borderRadius: '4px',
            color: el.color, fontSize: `${el.fontSize}px`,
            fontFamily: el.fontFamily,
            fontWeight: el.bold ? '700' : '400',
            fontStyle: el.italic ? 'italic' : 'normal',
            textAlign: el.textAlign,
            lineHeight: String(el.lineHeight),
            padding: '4px', resize: 'none', outline: 'none', boxSizing: 'border-box',
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div ref={textDivRef} style={textStyle}>
          {el.text || <span style={{ opacity: 0.3 }}>Doble clic para editar</span>}
        </div>
      )}
      {/* Resize handles — only when selected and not editing */}
      {isSelected && !editing && HANDLES.map((h) => (
        <div
          key={h.id}
          onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, h.id); }}
          style={{
            position: 'absolute',
            top: h.top,
            left: h.left,
            transform: h.transform,
            width: '7px',
            height: '7px',
            backgroundColor: '#ffffff',
            border: '1px solid rgba(99,102,241,0.8)',
            borderRadius: '50%',
            cursor: h.cursor,
            zIndex: 100,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
};

// ─── Main CanvasEditor component ──────────────────────────────────────────────

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  slide, selectedId, viewportMode, customCanvas,
  onSelectElement, onUpdateElement, onDeleteElement, onUpdateBackground,
}) => {
  const dims = getPreviewDimensions(viewportMode, customCanvas);
  const canvasW = dims.width * dims.scale;
  const canvasH = dims.height * dims.scale;

  const dragRef = useRef<DragState | null>(null);
  const activeElRef = useRef<string | null>(null);

  // ── Mouse move / up handlers (window level) ────────────────────────────────
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const drag = dragRef.current;
    const elId = activeElRef.current;
    if (!drag || !elId) return;

    const dx = ((e.clientX - drag.startMouseX) / drag.canvasW) * 100;
    const dy = ((e.clientY - drag.startMouseY) / drag.canvasH) * 100;

    if (drag.type === 'move') {
      onUpdateElement(elId, {
        x: clamp(drag.startX + dx, 0, 100 - drag.startW),
        y: clamp(drag.startY + dy, 0, 100 - drag.startH),
      });
      return;
    }

    // Resize
    const h = drag.handle!;
    let { startX: x, startY: y, startW: w, startH: hh } = drag;

    if (h.includes('e')) w = clamp(drag.startW + dx, 5, 100 - drag.startX);
    if (h.includes('s')) hh = clamp(drag.startH + dy, 3, 100 - drag.startY);
    if (h.includes('w')) {
      const newW = clamp(drag.startW - dx, 5, drag.startX + drag.startW);
      x = drag.startX + (drag.startW - newW);
      w = newW;
    }
    if (h.includes('n')) {
      const newH = clamp(drag.startH - dy, 3, drag.startY + drag.startH);
      y = drag.startY + (drag.startH - newH);
      hh = newH;
    }

    // Scale fontSize proportionally using preview canvas dimensions
    // fontSize is now stored in preview-px, so compare in preview pixel space
    const startWpx = drag.startW * drag.canvasW / 100;
    const newWpx   = w           * drag.canvasW / 100;
    const startHpx = drag.startH * drag.canvasH / 100;
    const newHpx   = hh          * drag.canvasH / 100;

    const scaleW = startWpx > 0 ? newWpx / startWpx : 1;
    const scaleH = startHpx > 0 ? newHpx / startHpx : 1;
    const isHorizontalOnly = (h === 'e' || h === 'w');
    const isVerticalOnly   = (h === 'n' || h === 's');
    const fontScale = isHorizontalOnly ? scaleW
                    : isVerticalOnly   ? scaleH
                    : (scaleW + scaleH) / 2;
    const newFontSize = Math.round(clamp(drag.startFontSize * fontScale, 4, 500));

    onUpdateElement(elId, { x, y, w, h: hh, fontSize: newFontSize });
  }, [onUpdateElement]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    activeElRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // ── Drag starters ──────────────────────────────────────────────────────────
  const startDrag = (e: React.MouseEvent, elId: string, type: 'move', handle?: ResizeHandle) => {
    e.preventDefault();
    const el = slide.elements.find((el) => el.id === elId);
    if (!el) return;
    activeElRef.current = elId;
    dragRef.current = {
      type, handle,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startX: el.x, startY: el.y, startW: el.w, startH: el.h,
      startFontSize: el.fontSize,
      canvasW, canvasH,
      fullW: dims.width, fullH: dims.height,
    };
  };

  const startResize = (e: React.MouseEvent, elId: string, handle: ResizeHandle) => {
    e.preventDefault();
    const el = slide.elements.find((el) => el.id === elId);
    if (!el) return;
    activeElRef.current = elId;
    dragRef.current = {
      type: 'resize', handle,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startX: el.x, startY: el.y, startW: el.w, startH: el.h,
      startFontSize: el.fontSize,
      canvasW, canvasH,
      fullW: dims.width, fullH: dims.height,
    };
  };

  const bg = slide.background;
  const hasBgImage = bg.backgroundType === 'image' && !!bg.backgroundImage;
  const selectedEl = slide.elements.find((e) => e.id === selectedId) ?? null;

  const upEl = (fields: Partial<CanvasElement>) => {
    if (!selectedId || !selectedEl) return;
    // When fontSize changes, recalculate box height to fit text snugly
    let extra: Partial<CanvasElement> = {};
    if (fields.fontSize !== undefined) {
      const newFs = fields.fontSize;
      const lines = Math.max(1, Math.ceil(selectedEl.text.length / Math.max(1, Math.floor(selectedEl.w * 9.6 / newFs))));
      extra.h = calcTextBoxH(newFs, selectedEl.lineHeight, lines, canvasH);
    }
    onUpdateElement(selectedId, { ...fields, ...extra });
  };

  // ── Split divider drag ─────────────────────────────────────────────────────
  const [isDividerHovered, setIsDividerHovered] = useState(false);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const splitDragRef = useRef<{ startMouse: number; startPos: number; axis: 'x' | 'y'; canvasPx: number } | null>(null);

  const handleSplitDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingDivider(true);
    const isVertical = (bg.splitDirection ?? 'vertical') === 'vertical';
    splitDragRef.current = {
      startMouse: isVertical ? e.clientX : e.clientY,
      startPos: bg.splitPosition ?? 50,
      axis: isVertical ? 'x' : 'y',
      canvasPx: isVertical ? canvasW : canvasH,
    };
  }, [bg.splitDirection, bg.splitPosition, canvasW, canvasH]);

  const handleSplitMouseMove = useCallback((e: MouseEvent) => {
    const d = splitDragRef.current;
    if (!d || !onUpdateBackground) return;
    const delta = ((d.axis === 'x' ? e.clientX : e.clientY) - d.startMouse);
    const deltaPct = (delta / d.canvasPx) * 100;
    const newPos = clamp(d.startPos + deltaPct, 5, 95);
    onUpdateBackground({ splitPosition: Math.round(newPos) });
  }, [onUpdateBackground]);

  const handleSplitMouseUp = useCallback(() => {
    splitDragRef.current = null;
    setIsDraggingDivider(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleSplitMouseMove);
    window.addEventListener('mouseup', handleSplitMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleSplitMouseMove);
      window.removeEventListener('mouseup', handleSplitMouseUp);
    };
  }, [handleSplitMouseMove, handleSplitMouseUp]);


  // ── Rulers ────────────────────────────────────────────────────────────────
  const [showRulers, setShowRulers] = useState(true);
  const [rulerUnit, setRulerUnit] = useState<'px' | '%'>('px');

  // ── Zoom (scroll-wheel) ───────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => {
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      return Math.min(3, Math.max(0.25, Math.round((prev + delta) * 100) / 100));
    });
  }, []);

  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  return (
    <div className="canvas-area" ref={canvasAreaRef}>

      {/* ── Top-right control bar: Resolution + Zoom + Ruler toggle ── */}
      <div style={{
        position: 'absolute', top: 30, right: 14, zIndex: 150,
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        {/* Resolution indicator */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(13,17,23,0.92)', border: '1px solid var(--border-subtle)',
          borderRadius: '8px', padding: '5px 10px', fontSize: '11px', color: 'var(--text-muted)',
          fontWeight: '500'
        }}>
          {dims.width} × {dims.height} px
        </div>

        {/* Zoom controls */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '3px',
          background: 'rgba(13,17,23,0.92)', border: '1px solid var(--border-subtle)',
          borderRadius: '8px', padding: '3px 8px', fontSize: '11px',
        }}>
          <button onClick={() => setZoom(z => Math.max(0.25, Math.round((z - 0.1) * 100) / 100))}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 3px', fontSize: '15px', lineHeight: 1 }}>−</button>
          <span onClick={() => setZoom(1)} title="Clic para 100%"
            style={{ color: zoom !== 1 ? '#a5b4fc' : 'var(--text-muted)', minWidth: '38px', textAlign: 'center', cursor: 'pointer', fontWeight: '600' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.min(3, Math.round((z + 0.1) * 100) / 100))}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 3px', fontSize: '15px', lineHeight: 1 }}>+</button>
        </div>

        {/* Ruler toggle */}
        <button
          onClick={() => setShowRulers(!showRulers)}
          className="btn btn-secondary"
          title={showRulers ? 'Ocultar reglas' : 'Mostrar reglas'}
          style={{
            fontSize: '11px', padding: '4px 8px',
            display: 'flex', alignItems: 'center', gap: '4px',
            background: showRulers ? 'rgba(99,102,241,0.2)' : 'rgba(19,19,26,0.85)',
            borderColor: showRulers ? 'rgba(99,102,241,0.6)' : 'var(--border-subtle)',
            color: showRulers ? '#a5b4fc' : 'var(--text-muted)',
          }}
        >
          <Ruler size={13} />
          <span>{showRulers ? 'Reglas ON' : 'Reglas'}</span>
        </button>
      </div>

      {/* ── Floating contextual toolbar ── */}
      {selectedEl && (
        <div
          style={{
            position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
            zIndex: 200, display: 'flex', alignItems: 'center', gap: '4px',
            background: 'rgba(19,19,26,0.95)', backdropFilter: 'blur(10px)',
            border: '1px solid var(--border-subtle)', borderRadius: '10px',
            padding: '5px 10px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Font */}
          <select
            value={selectedEl.fontFamily}
            onChange={(e) => upEl({ fontFamily: e.target.value })}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer', outline: 'none', maxWidth: '100px' }}
          >
            {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>

          <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />

          {/* Font size */}
          <button onClick={() => upEl({ fontSize: Math.max(4, selectedEl.fontSize - 1) })}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
            <Minus size={12} />
          </button>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', minWidth: '28px', textAlign: 'center' }}>
            {selectedEl.fontSize}
          </span>
          <button onClick={() => upEl({ fontSize: Math.min(500, selectedEl.fontSize + 1) })}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
            <Plus size={12} />
          </button>

          <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />

          {/* Color */}
          <input type="color" value={selectedEl.color.startsWith('#') ? selectedEl.color : '#ffffff'}
            onChange={(e) => upEl({ color: e.target.value })}
            style={{ width: '22px', height: '22px', padding: '1px', cursor: 'pointer', border: '1px solid var(--border-subtle)', borderRadius: '4px', background: 'transparent' }} />

          <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />

          {/* Bold / Italic / Uppercase */}
          {[
            { icon: <Bold size={13}/>,   active: selectedEl.bold,      action: () => upEl({ bold: !selectedEl.bold }) },
            { icon: <Italic size={13}/>, active: selectedEl.italic,    action: () => upEl({ italic: !selectedEl.italic }) },
            { icon: <Type size={13}/>,   active: selectedEl.uppercase, action: () => upEl({ uppercase: !selectedEl.uppercase }) },
          ].map((btn, i) => (
            <button key={i} onClick={btn.action}
              style={{ background: btn.active ? 'rgba(99,102,241,0.25)' : 'none', border: 'none',
                color: btn.active ? '#a5b4fc' : 'var(--text-muted)', cursor: 'pointer',
                padding: '4px 6px', borderRadius: '5px', display: 'flex', alignItems: 'center' }}>
              {btn.icon}
            </button>
          ))}

          <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />

          {/* Alignment */}
          {([['left', <AlignLeft size={13}/>], ['center', <AlignCenter size={13}/>], ['right', <AlignRight size={13}/>]] as const).map(([a, icon]) => (
            <button key={a} onClick={() => upEl({ textAlign: a })}
              style={{ background: selectedEl.textAlign === a ? 'rgba(99,102,241,0.25)' : 'none', border: 'none',
                color: selectedEl.textAlign === a ? '#a5b4fc' : 'var(--text-muted)', cursor: 'pointer',
                padding: '4px 6px', borderRadius: '5px', display: 'flex', alignItems: 'center' }}>
              {icon}
            </button>
          ))}

          <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />

          {/* Delete */}
          <button onClick={() => onDeleteElement(selectedId!)}
            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer',
              padding: '4px 6px', borderRadius: '5px', display: 'flex', alignItems: 'center' }}>
            <Trash2 size={13} />
          </button>
        </div>
      )}

      {/* ── Fixed Rulers at edges of canvas area ── */}
      {showRulers && (
        <>
          {/* Top Edge: Horizontal Ruler */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 20, zIndex: 100, display: 'flex' }}>
            <div
              onClick={() => setRulerUnit(rulerUnit === 'px' ? '%' : 'px')}
              title={`Unidad: ${rulerUnit} (Clic para cambiar a ${rulerUnit === 'px' ? '%' : 'px'})`}
              style={{
                width: '20px', height: '20px', flexShrink: 0,
                background: '#0d1117', borderRight: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '8px', fontWeight: '700', color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer', userSelect: 'none', zIndex: 101,
              }}
            >
              {rulerUnit}
            </div>
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0d1117', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
                <HorizontalRuler canvasW={canvasW} fullW={dims.width} zoom={zoom} selectedEl={selectedEl} unit={rulerUnit} />
              </div>
            </div>
          </div>

          {/* Left Edge: Vertical Ruler */}
          <div style={{ position: 'absolute', top: 20, left: 0, bottom: 0, width: 20, zIndex: 100, background: '#0d1117', borderRight: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)' }}>
                <VerticalRuler canvasH={canvasH} fullH={dims.height} zoom={zoom} selectedEl={selectedEl} unit={rulerUnit} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Canvas Container ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', padding: '40px', width: '100%', height: '100%', justifyContent: 'center' }}>
          {/* Zoom wrapper — canvas scales with transform */}
          <div style={{
            width: `${canvasW}px`,
            height: `${canvasH}px`,
            transformOrigin: 'top left',
            transform: `scale(${zoom})`,
            flexShrink: 0,
          }}>

          {/* Slide canvas */}
          <div
            style={{
              width: `${canvasW}px`,
              height: `${canvasH}px`,
              position: 'relative',
              boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
              borderRadius: showRulers ? '0 0 8px 0' : '8px',
              overflow: 'hidden',
              cursor: 'default',
            }}
            onMouseDown={() => onSelectElement(null)}
          >
        {/* ── Background layers ── */}
        <div style={buildSlideStyle(bg)} />

        {/* ── Split background layer (second panel) ── */}
        {bg.splitEnabled && (
          <div style={buildSplitPanelStyle(bg)} />
        )}

        {/* ── Draggable Split Divider Handle (interactive only on canvas) ── */}
        {bg.splitEnabled && (
          <div
            onMouseDown={handleSplitDividerMouseDown}
            onMouseEnter={() => setIsDividerHovered(true)}
            onMouseLeave={() => setIsDividerHovered(false)}
            title="Arrastra para mover la división de fondos"
            style={{
              position: 'absolute',
              zIndex: 9,
              cursor: (bg.splitDirection ?? 'vertical') === 'vertical' ? 'col-resize' : 'row-resize',
              ...((bg.splitDirection ?? 'vertical') === 'vertical'
                ? {
                    top: 0,
                    bottom: 0,
                    left: `${bg.splitPosition ?? 50}%`,
                    width: '20px',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }
                : {
                    left: 0,
                    right: 0,
                    top: `${bg.splitPosition ?? 50}%`,
                    height: '20px',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }),
            }}
          >
            {/* Grab pill indicator — only visible on hover or during drag */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 6px',
                borderRadius: '9999px',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                color: '#ffffff',
                opacity: isDividerHovered || isDraggingDivider ? 1 : 0,
                transform: isDividerHovered || isDraggingDivider ? 'scale(1)' : 'scale(0.8)',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
                pointerEvents: 'none',
              }}
            >
              {(bg.splitDirection ?? 'vertical') === 'vertical' ? (
                <GripVertical size={14} />
              ) : (
                <GripHorizontal size={14} />
              )}
            </div>
          </div>
        )}


        {hasBgImage && bg.bgBlur > 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${bg.backgroundImage})`,
            backgroundSize: bg.bgSize,
            backgroundPosition: bg.bgPosition,
            backgroundRepeat: 'no-repeat',
            filter: `blur(${bg.bgBlur}px)`,
            transform: 'scale(1.05)',
            zIndex: 0,
          }} />
        )}

        {(hasBgImage || bg.backgroundType !== 'solid') && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1, backgroundColor: bg.overlayColor, opacity: bg.overlayOpacity, pointerEvents: 'none' }} />
        )}
        {bg.overlayGradient && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: bg.overlayGradientValue, pointerEvents: 'none' }} />
        )}
        {bg.vignetteOpacity > 0 && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 3, background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${bg.vignetteOpacity}) 100%)`, pointerEvents: 'none' }} />
        )}
        {bg.innerShadow && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 4, boxShadow: 'inset 0 0 120px rgba(0,0,0,0.7)', pointerEvents: 'none' }} />
        )}

        {/* ── Canvas elements ── */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
          {slide.elements.map((el) => (
            <CanvasElementNode
              key={el.id}
              el={el}
              isSelected={selectedId === el.id}
              scale={dims.scale}
              canvasW={canvasW}
              canvasH={canvasH}
              onSelect={() => onSelectElement(el.id)}
              onDragStart={(e, type) => startDrag(e, el.id, type)}
              onResizeStart={(e, handle) => startResize(e, el.id, handle)}
              onCommitText={(text) => onUpdateElement(el.id, { text })}
              onFitToText={(w, h) => onUpdateElement(el.id, { w, h })}
              shadowColor={bg.textShadowColor}
              shadowBlur={bg.textShadowBlur}
            />
          ))}
        </div>
          </div>
          </div>{/* /zoom wrapper */}
      </div>
    </div>
  );
};
