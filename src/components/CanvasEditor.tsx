import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { Slide, CanvasElement, SlideBackground, ViewportMode, CustomCanvasSize } from '../types';
import { getViewportDimensions } from '../utils/captureSlide';

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
  canvasW: number;
  canvasH: number;
}

interface CanvasEditorProps {
  slide: Slide;
  selectedId: string | null;
  viewportMode: ViewportMode;
  customCanvas?: CustomCanvasSize;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, fields: Partial<CanvasElement>) => void;
  onAddTextElement: () => void;
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
  shadowColor: string;
  shadowBlur: number;
}> = ({ el, isSelected, scale, onSelect, onDragStart, onResizeStart, onCommitText, shadowColor, shadowBlur }) => {
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const shadowStr = el.textShadow
    ? `0 ${shadowBlur}px ${shadowBlur * 2}px ${shadowColor}`
    : undefined;

  const textStyle: React.CSSProperties = {
    color: el.color,
    fontSize: `${el.fontSize * scale}px`,
    fontFamily: el.fontFamily,
    fontWeight: el.bold ? '700' : '400',
    fontStyle: el.italic ? 'italic' : 'normal',
    textTransform: el.uppercase ? 'uppercase' : 'none',
    textAlign: el.textAlign,
    lineHeight: el.lineHeight,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    opacity: el.opacity,
    ...(el.rotation !== 0 ? { transform: `rotate(${el.rotation}deg)` } : {}),
    ...(shadowStr ? { textShadow: shadowStr } : {}),
    ...(el.isReference ? {
      fontSize: `${el.fontSize * scale * 0.55}px`,
      letterSpacing: '1px',
      fontWeight: '600',
    } : {}),
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
    cursor: isSelected ? 'move' : 'pointer',
    userSelect: 'none',
    outline: isSelected ? `${Math.max(1, scale * 2)}px solid #6366f1` : 'none',
    outlineOffset: '1px',
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
          onKeyDown={(e) => { if (e.key === 'Escape') { setEditing(false); } }}
          style={{
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            border: '2px solid #6366f1',
            borderRadius: '4px',
            color: el.color,
            fontSize: `${el.fontSize * scale}px`,
            fontFamily: el.fontFamily,
            fontWeight: el.bold ? '700' : '400',
            fontStyle: el.italic ? 'italic' : 'normal',
            textAlign: el.textAlign,
            lineHeight: String(el.lineHeight),
            padding: '4px',
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          <div style={{ ...textStyle, width: '100%' }}>{el.text || <span style={{ opacity: 0.4 }}>Doble clic para editar</span>}</div>
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
            width: `${Math.max(8, 10 / scale)}px`,
            height: `${Math.max(8, 10 / scale)}px`,
            backgroundColor: '#ffffff',
            border: '2px solid #6366f1',
            borderRadius: '2px',
            cursor: h.cursor,
            zIndex: 100,
          }}
        />
      ))}
    </div>
  );
};

// ─── Main CanvasEditor component ──────────────────────────────────────────────

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  slide,
  selectedId,
  viewportMode,
  customCanvas,
  onSelectElement,
  onUpdateElement,
  onAddTextElement,
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

    onUpdateElement(elId, { x, y, w, h: hh });
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
      canvasW, canvasH,
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
      canvasW, canvasH,
    };
  };

  const bg = slide.background;
  const hasBgImage = bg.backgroundType === 'image' && !!bg.backgroundImage;

  return (
    <div className="canvas-area">
      {/* Toolbar */}
      <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', gap: '6px' }}>
        <button
          className="btn btn-secondary"
          style={{ fontSize: '12px', padding: '5px 12px' }}
          onClick={onAddTextElement}
        >
          + Texto
        </button>
      </div>

      {/* Scaled canvas wrapper */}
      <div
        style={{
          width: `${canvasW}px`,
          height: `${canvasH}px`,
          position: 'relative',
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          borderRadius: '8px',
          overflow: 'hidden',
          cursor: 'default',
        }}
        onMouseDown={() => onSelectElement(null)}
      >
        {/* ── Background layers ── */}
        <div style={buildSlideStyle(bg)} />

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
              shadowColor={bg.textShadowColor}
              shadowBlur={bg.textShadowBlur}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
