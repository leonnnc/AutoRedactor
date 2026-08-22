import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { Slide, CanvasElement, SlideBackground, ViewportMode, CustomCanvasSize } from '../types';
import { getViewportDimensions } from '../utils/captureSlide';
import { calcTextBoxH } from '../utils/parseSermon';
import { Bold, Italic, Type, AlignLeft, AlignCenter, AlignRight, Trash2, Plus, Minus, GripVertical, GripHorizontal, Ruler, Image, Upload, Layers, Crop, Check } from 'lucide-react';
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
  onAddImageElement?: (src: string, x?: number, y?: number, w?: number, h?: number) => void;
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

  // Auto-fit ONCE after first paint to get real browser dimensions (only for text elements)
  useEffect(() => {
    if (el.type !== 'text' || fittedRef.current || editing || !textDivRef.current) return;
    const rect = textDivRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    fittedRef.current = true;
    const newW = Math.min(95, Math.max(5, ((rect.width  + PAD_PX * 2) / canvasW) * 100));
    const newH = Math.min(95, Math.max(2, ((rect.height + PAD_PX * 2) / canvasH) * 100));
    if (Math.abs(newW - el.w) > 0.3 || Math.abs(newH - el.h) > 0.3) {
      onFitToText(newW, newH);
    }
  });

  // Re-fit when fontSize changes
  const prevFontSize = useRef(el.fontSize);
  if (prevFontSize.current !== el.fontSize) {
    prevFontSize.current = el.fontSize;
    fittedRef.current = false;
  }

  const shadowStr = el.textShadow
    ? `0 ${shadowBlur}px ${shadowBlur * 2}px ${shadowColor}`
    : undefined;

  const textStyle: React.CSSProperties = {
    color: el.color || '#ffffff',
    fontSize: `${el.fontSize ?? 48}px`,
    fontFamily: el.fontFamily || "'Playfair Display', serif",
    fontWeight: el.bold ? '700' : '400',
    fontStyle: el.italic ? 'italic' : 'normal',
    textTransform: el.uppercase ? 'uppercase' : 'none',
    textAlign: el.textAlign || 'center',
    lineHeight: el.lineHeight || 1.3,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    width: '100%',
    opacity: el.opacity ?? 1,
    ...(el.rotation !== 0 ? { transform: `rotate(${el.rotation}deg)` } : {}),
    ...(shadowStr ? { textShadow: shadowStr } : {}),
    ...(el.isReference ? { letterSpacing: '1px', fontWeight: '600' } : {}),
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (el.type === 'text') {
      setEditing(true);
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 20);
    }
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
    padding: el.type === 'text' ? `${PAD_PX}px` : '0px',
    cursor: isSelected ? 'move' : 'pointer',
    userSelect: 'none',
    outline: isSelected ? `2px solid rgba(99,102,241,0.9)` : 'none',
    outlineOffset: '2px',
    overflow: 'visible',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (el.type === 'image' && el.src) {
    // Build crop CSS: position image so only the cropped region is visible
    const cx = el.cropX ?? 0;
    const cy = el.cropY ?? 0;
    const cw = el.cropW ?? 100;
    const ch = el.cropH ?? 100;
    const hasCrop = cx > 0 || cy > 0 || cw < 100 || ch < 100;

    return (
      <div
        style={wrapperStyle}
        onMouseDown={(e) => {
          e.stopPropagation();
          onSelect();
          onDragStart(e, 'move');
        }}
      >
        {/* Crop container — overflow clips the scaled image to the visible crop region */}
        <div style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
          borderRadius: `${el.borderRadius || 0}px`,
          opacity: el.opacity ?? 1,
          filter: el.shadow ? 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' : undefined,
        }}>
          <img
            src={el.src}
            alt="Slide element"
            draggable={false}
            style={hasCrop ? {
              // Scale image so crop region fills the container exactly
              position: 'absolute',
              width: `${100 / (cw / 100)}%`,
              height: `${100 / (ch / 100)}%`,
              left: `${-(cx / cw) * 100}%`,
              top: `${-(cy / ch) * 100}%`,
              objectFit: 'fill',
              pointerEvents: 'none',
              userSelect: 'none',
              display: 'block',
              ...(el.rotation !== 0 ? { transform: `rotate(${el.rotation}deg)` } : {}),
            } : {
              width: '100%',
              height: '100%',
              objectFit: el.objectFit || 'fill',
              pointerEvents: 'none',
              userSelect: 'none',
              display: 'block',
              ...(el.rotation !== 0 ? { transform: `rotate(${el.rotation}deg)` } : {}),
            }}
          />
        </div>
        {/* Resize handles when selected */}
        {isSelected && HANDLES.map((h) => (
          <div
            key={h.id}
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, h.id); }}
            style={{
              position: 'absolute',
              top: h.top,
              left: h.left,
              transform: h.transform,
              width: '8px',
              height: '8px',
              backgroundColor: '#ffffff',
              border: '2px solid #6366f1',
              borderRadius: '50%',
              cursor: h.cursor,
              zIndex: 100,
              boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
            }}
          />
        ))}
      </div>
    );
  }

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
  onSelectElement, onUpdateElement, onDeleteElement, onUpdateBackground, onAddImageElement,
}) => {
  const dims = getPreviewDimensions(viewportMode, customCanvas);
  const canvasW = dims.width * dims.scale;
  const canvasH = dims.height * dims.scale;

  const dragRef = useRef<DragState | null>(null);
  const activeElRef = useRef<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const replaceImageInputRef = useRef<HTMLInputElement>(null);

  // ── Crop mode ───────────────────────────────────────────────────────────────
  const [isCropMode, setIsCropMode] = useState(false);
  // Crop handles in % (relative to the image element)
  const [cropDraft, setCropDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const cropDragRef = useRef<{
    handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move';
    startMX: number; startMY: number;
    startCX: number; startCY: number; startCW: number; startCH: number;
    elW: number; elH: number; // element size in canvas px
  } | null>(null);

  // ── Drag & Drop Files onto Canvas ──────────────────────────────────────────
  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleCanvasDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0 || !onAddImageElement) return;

    // Calculate drop position %
    const rect = e.currentTarget.getBoundingClientRect();
    const dropX = clamp(((e.clientX - rect.left) / rect.width) * 100 - 20, 2, 60);
    const dropY = clamp(((e.clientY - rect.top) / rect.height) * 100 - 10, 2, 60);

    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const src = loadEvt.target?.result as string;
        if (src) {
          // Pass drop position; let App compute proportional size from naturalWidth/Height
          onAddImageElement(src, dropX + index * 3, dropY + index * 3);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [onAddImageElement]);

  // ── Clipboard Paste (Ctrl + V) ──────────────────────────────────────────────
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!onAddImageElement) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvt) => {
              const src = loadEvt.target?.result as string;
              if (src) {
                // No explicit position → center on canvas; App computes proportional size
                onAddImageElement(src);
              }
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onAddImageElement]);

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

    // Scale fontSize proportionally using preview canvas dimensions (only if it has font)
    if (drag.startFontSize) {
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
    } else {
      onUpdateElement(elId, { x, y, w, h: hh });
    }
  }, [onUpdateElement]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    activeElRef.current = null;
  }, []);

  // ── Crop drag handlers ────────────────────────────────────────────────────
  const handleCropMouseMove = useCallback((e: MouseEvent) => {
    const d = cropDragRef.current;
    if (!d || !cropDraft) return;

    const dxPct = ((e.clientX - d.startMX) / d.elW) * 100;
    const dyPct = ((e.clientY - d.startMY) / d.elH) * 100;
    let { startCX: cx, startCY: cy, startCW: cw, startCH: ch } = d;

    if (d.handle === 'move') {
      cx = clamp(cx + dxPct, 0, 100 - cw);
      cy = clamp(cy + dyPct, 0, 100 - ch);
    } else {
      if (d.handle.includes('e')) cw = clamp(cw + dxPct, 5, 100 - cx);
      if (d.handle.includes('s')) ch = clamp(ch + dyPct, 5, 100 - cy);
      if (d.handle.includes('w')) {
        const newCW = clamp(cw - dxPct, 5, cx + cw);
        cx = cx + (cw - newCW);
        cw = newCW;
      }
      if (d.handle.includes('n')) {
        const newCH = clamp(ch - dyPct, 5, cy + ch);
        cy = cy + (ch - newCH);
        ch = newCH;
      }
    }
    setCropDraft({ x: cx, y: cy, w: cw, h: ch });
  }, [cropDraft]);

  const handleCropMouseUp = useCallback(() => {
    cropDragRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleCropMouseMove);
    window.addEventListener('mouseup', handleCropMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleCropMouseMove);
      window.removeEventListener('mouseup', handleCropMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, handleCropMouseMove, handleCropMouseUp]);

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
      startFontSize: el.fontSize ?? 48,
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
      startFontSize: el.fontSize ?? 48,
      canvasW, canvasH,
      fullW: dims.width, fullH: dims.height,
    };
  };

  const bg = slide.background;
  const hasBgImage = bg.backgroundType === 'image' && !!bg.backgroundImage;
  const selectedEl = slide.elements.find((e) => e.id === selectedId) ?? null;

  const upEl = (fields: Partial<CanvasElement>) => {
    if (!selectedId || !selectedEl) return;
    // When fontSize changes on text elements, recalculate box height to fit text snugly
    let extra: Partial<CanvasElement> = {};
    if (fields.fontSize !== undefined && selectedEl.text && selectedEl.type === 'text') {
      const newFs = fields.fontSize;
      const lines = Math.max(1, Math.ceil(selectedEl.text.length / Math.max(1, Math.floor(selectedEl.w * 9.6 / newFs))));
      extra.h = calcTextBoxH(newFs, selectedEl.lineHeight || 1.3, lines, canvasH);
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

  // Reset crop mode when selection changes
  useEffect(() => {
    setIsCropMode(false);
    setCropDraft(null);
  }, [selectedId]);

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

      {/* Hidden input for replacing image */}
      <input
        type="file"
        ref={replaceImageInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && selectedId) {
            const reader = new FileReader();
            reader.onload = (loadEvt) => {
              const src = loadEvt.target?.result as string;
              if (src) upEl({ src });
            };
            reader.readAsDataURL(file);
          }
          e.target.value = '';
        }}
      />

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
          {/* Floating toolbar for TEXT elements */}
          {selectedEl.type === 'text' && (
            <>
              {/* Font */}
              <select
                value={selectedEl.fontFamily || "'Playfair Display', serif"}
                onChange={(e) => upEl({ fontFamily: e.target.value })}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer', outline: 'none', maxWidth: '100px' }}
              >
                {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>

              <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />

              {/* Font size */}
              <button onClick={() => upEl({ fontSize: Math.max(4, (selectedEl.fontSize ?? 48) - 1) })}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                <Minus size={12} />
              </button>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', minWidth: '28px', textAlign: 'center' }}>
                {selectedEl.fontSize ?? 48}
              </span>
              <button onClick={() => upEl({ fontSize: Math.min(500, (selectedEl.fontSize ?? 48) + 1) })}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                <Plus size={12} />
              </button>

              <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />

              {/* Color */}
              <input type="color" value={selectedEl.color?.startsWith('#') ? selectedEl.color : '#ffffff'}
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
            </>
          )}

          {/* Floating toolbar for IMAGE elements */}
          {selectedEl.type === 'image' && (
            <>
              {/* Fit Mode */}
              <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px' }}>
                {(['contain', 'cover', 'fill'] as const).map((fit) => (
                  <button
                    key={fit}
                    onClick={() => upEl({ objectFit: fit })}
                    title={`Ajuste: ${fit}`}
                    style={{
                      background: (selectedEl.objectFit || 'contain') === fit ? 'rgba(99,102,241,0.4)' : 'none',
                      border: 'none',
                      color: (selectedEl.objectFit || 'contain') === fit ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '11px',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      fontWeight: (selectedEl.objectFit || 'contain') === fit ? '600' : '400',
                    }}
                  >
                    {fit}
                  </button>
                ))}
              </div>

              <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />

              {/* Border Radius presets */}
              <div style={{ display: 'flex', gap: '2px' }}>
                {[
                  { label: '0', val: 0, title: 'Bordes rectos (0px)' },
                  { label: '8', val: 8, title: 'Bordes suaves (8px)' },
                  { label: '20', val: 20, title: 'Bordes redondeados (20px)' },
                  { label: '●', val: 9999, title: 'Circular' },
                ].map((b) => (
                  <button
                    key={b.val}
                    onClick={() => upEl({ borderRadius: b.val })}
                    title={b.title}
                    style={{
                      background: (selectedEl.borderRadius || 0) === b.val ? 'rgba(99,102,241,0.4)' : 'none',
                      border: 'none',
                      color: (selectedEl.borderRadius || 0) === b.val ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '11px',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />

              {/* Shadow toggle */}
              <button
                onClick={() => upEl({ shadow: !selectedEl.shadow })}
                title="Sombra flotante"
                style={{
                  background: selectedEl.shadow ? 'rgba(99,102,241,0.35)' : 'none',
                  border: 'none',
                  color: selectedEl.shadow ? '#a5b4fc' : 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Layers size={12} />
                <span>Sombra</span>
              </button>

              <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />

              {/* Opacity */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Opac:</span>
                {[1, 0.75, 0.5].map((op) => (
                  <button
                    key={op}
                    onClick={() => upEl({ opacity: op })}
                    style={{
                      background: (selectedEl.opacity ?? 1) === op ? 'rgba(99,102,241,0.4)' : 'none',
                      border: 'none',
                      color: (selectedEl.opacity ?? 1) === op ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '10px',
                      padding: '2px 4px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                  >
                    {Math.round(op * 100)}%
                  </button>
                ))}
              </div>

              <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />

              {/* Replace Image */}
              <button
                onClick={() => replaceImageInputRef.current?.click()}
                title="Cambiar imagen"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Upload size={12} />
                <span>Cambiar</span>
              </button>

              <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />

              {/* Crop button */}
              <button
                onClick={() => {
                  if (isCropMode) {
                    setIsCropMode(false);
                    setCropDraft(null);
                  } else {
                    // Initialize crop draft from existing crop or full image
                    const el = selectedEl!;
                    setCropDraft({
                      x: el.cropX ?? 0,
                      y: el.cropY ?? 0,
                      w: el.cropW ?? 100,
                      h: el.cropH ?? 100,
                    });
                    setIsCropMode(true);
                  }
                }}
                title={isCropMode ? 'Cancelar recorte' : 'Recortar imagen'}
                style={{
                  background: isCropMode ? 'rgba(245,158,11,0.25)' : 'none',
                  border: isCropMode ? '1px solid rgba(245,158,11,0.6)' : 'none',
                  color: isCropMode ? '#fbbf24' : 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Crop size={12} />
                <span>{isCropMode ? 'Cancelar' : 'Recortar'}</span>
              </button>

              {/* Apply crop button — only visible in crop mode */}
              {isCropMode && cropDraft && (
                <button
                  onClick={() => {
                    if (selectedId && cropDraft) {
                      onUpdateElement(selectedId, {
                        cropX: cropDraft.x,
                        cropY: cropDraft.y,
                        cropW: cropDraft.w,
                        cropH: cropDraft.h,
                      });
                    }
                    setIsCropMode(false);
                    setCropDraft(null);
                  }}
                  title="Aplicar recorte"
                  style={{
                    background: 'rgba(34,197,94,0.25)',
                    border: '1px solid rgba(34,197,94,0.6)',
                    color: '#4ade80',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontWeight: '600',
                  }}
                >
                  <Check size={12} />
                  <span>Aplicar</span>
                </button>
              )}
            </>
          )}

          <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />

          {/* Delete */}
          <button onClick={() => onDeleteElement(selectedId!)}
            title="Eliminar elemento"
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
            onDragOver={handleCanvasDragOver}
            onDragLeave={handleCanvasDragLeave}
            onDrop={handleCanvasDrop}
          >
            {/* Visual drop zone overlay */}
            {isDraggingOver && (
              <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1000,
                background: 'rgba(15, 23, 42, 0.88)',
                backdropFilter: 'blur(6px)',
                border: '3px dashed #818cf8',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                color: '#e0e7ff',
                pointerEvents: 'none',
              }}>
                <div style={{
                  padding: '16px',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.25)',
                  border: '1px solid rgba(129, 140, 248, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Image size={36} style={{ color: '#818cf8' }} />
                </div>
                <div style={{ fontWeight: '600', fontSize: '15px' }}>
                  Suelta tu imagen aquí
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  Se agregará como elemento flotante a la diapositiva
                </div>
              </div>
            )}

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

        {/* ── Crop overlay ── */}
        {isCropMode && cropDraft && selectedEl && selectedEl.type === 'image' && (() => {
          const elLeft = selectedEl.x / 100 * canvasW;
          const elTop  = selectedEl.y / 100 * canvasH;
          const elW    = selectedEl.w / 100 * canvasW;
          const elH    = selectedEl.h / 100 * canvasH;

          const cropL = cropDraft.x / 100 * elW;
          const cropT = cropDraft.y / 100 * elH;
          const cropR = (1 - (cropDraft.x + cropDraft.w) / 100) * elW;
          const cropB = (1 - (cropDraft.y + cropDraft.h) / 100) * elH;

          const CROP_HANDLES: { id: 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'; top: string; left: string; cursor: string }[] = [
            { id: 'nw', top: '0',   left: '0',   cursor: 'nw-resize' },
            { id: 'n',  top: '0',   left: '50%', cursor: 'n-resize'  },
            { id: 'ne', top: '0',   left: '100%',cursor: 'ne-resize' },
            { id: 'e',  top: '50%', left: '100%',cursor: 'e-resize'  },
            { id: 'se', top: '100%',left: '100%',cursor: 'se-resize' },
            { id: 's',  top: '100%',left: '50%', cursor: 's-resize'  },
            { id: 'sw', top: '100%',left: '0',   cursor: 'sw-resize' },
            { id: 'w',  top: '50%', left: '0',   cursor: 'w-resize'  },
          ];

          return (
            <div
              style={{
                position: 'absolute',
                left: elLeft,
                top: elTop,
                width: elW,
                height: elH,
                zIndex: 500,
                pointerEvents: 'none',
              }}
            >
              {/* Dark mask: top */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: cropT, background: 'rgba(0,0,0,0.55)', pointerEvents: 'none' }} />
              {/* Dark mask: bottom */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: cropB, background: 'rgba(0,0,0,0.55)', pointerEvents: 'none' }} />
              {/* Dark mask: left */}
              <div style={{ position: 'absolute', top: cropT, bottom: cropB, left: 0, width: cropL, background: 'rgba(0,0,0,0.55)', pointerEvents: 'none' }} />
              {/* Dark mask: right */}
              <div style={{ position: 'absolute', top: cropT, bottom: cropB, right: 0, width: cropR, background: 'rgba(0,0,0,0.55)', pointerEvents: 'none' }} />

              {/* Crop border rect — interactive: drag to move crop box */}
              <div
                style={{
                  position: 'absolute',
                  left: cropL,
                  top: cropT,
                  width: elW - cropL - cropR,
                  height: elH - cropT - cropB,
                  border: '2px solid #fbbf24',
                  boxSizing: 'border-box',
                  cursor: 'move',
                  pointerEvents: 'all',
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  cropDragRef.current = {
                    handle: 'move',
                    startMX: e.clientX, startMY: e.clientY,
                    startCX: cropDraft.x, startCY: cropDraft.y,
                    startCW: cropDraft.w, startCH: cropDraft.h,
                    elW, elH,
                  };
                }}
              >
                {/* Rule-of-thirds grid lines */}
                {[1/3, 2/3].map((f, i) => (
                  <React.Fragment key={i}>
                    <div style={{ position: 'absolute', left: `${f * 100}%`, top: 0, bottom: 0, width: '1px', background: 'rgba(251,191,36,0.35)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', top: `${f * 100}%`, left: 0, right: 0, height: '1px', background: 'rgba(251,191,36,0.35)', pointerEvents: 'none' }} />
                  </React.Fragment>
                ))}

                {/* Crop resize handles */}
                {CROP_HANDLES.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      position: 'absolute',
                      top: h.top, left: h.left,
                      transform: 'translate(-50%, -50%)',
                      width: '10px', height: '10px',
                      background: '#fbbf24',
                      border: '2px solid #fff',
                      borderRadius: '2px',
                      cursor: h.cursor,
                      zIndex: 501,
                      pointerEvents: 'all',
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      cropDragRef.current = {
                        handle: h.id,
                        startMX: e.clientX, startMY: e.clientY,
                        startCX: cropDraft.x, startCY: cropDraft.y,
                        startCW: cropDraft.w, startCH: cropDraft.h,
                        elW, elH,
                      };
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })()}

          </div>
          </div>{/* /zoom wrapper */}
      </div>
    </div>
  );
};
