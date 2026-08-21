/**
 * SlidePreview — read-only render of a slide (no drag handles).
 * Used in the filmstrip thumbnails. The live editor uses CanvasEditor instead.
 */
import React from 'react';
import type { Slide, ViewportMode, CustomCanvasSize } from '../types';
import { getViewportDimensions } from '../utils/captureSlide';

interface SlidePreviewProps {
  slide: Slide | null;
  viewportMode: ViewportMode;
  customCanvas?: CustomCanvasSize;
  /** Optional ref forwarded to the inner slide div (for legacy compat) */
  canvasRef?: React.RefObject<HTMLDivElement | null>;
}

export const getPreviewDimensions = (mode: ViewportMode, custom?: CustomCanvasSize) => {
  if (mode === 'custom' && custom) {
    const maxW = 960;
    const scale = Math.min(1, maxW / custom.width);
    return { width: custom.width, height: custom.height, scale };
  }
  return getViewportDimensions(mode, custom);
};

export const SlidePreview: React.FC<SlidePreviewProps> = ({
  slide,
  viewportMode,
  customCanvas,
  canvasRef,
}) => {
  if (!slide) {
    return (
      <div className="canvas-area">
        <div style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
          Selecciona o crea una diapositiva
        </div>
      </div>
    );
  }

  const dims = getPreviewDimensions(viewportMode, customCanvas);
  const bg = slide.background;
  const hasBgImage = bg.backgroundType === 'image' && !!bg.backgroundImage;

  // ── background root style ──────────────────────────────────────────────────
  const bgStyle: React.CSSProperties = (() => {
    if (bg.backgroundType === 'solid') return { backgroundColor: bg.backgroundColor };
    if (bg.backgroundType === 'gradient') return { background: bg.backgroundGradient };
    if (hasBgImage && bg.bgBlur === 0) {
      return {
        backgroundImage: `url(${bg.backgroundImage})`,
        backgroundSize: bg.bgSize,
        backgroundPosition: bg.bgPosition,
        backgroundRepeat: 'no-repeat',
      };
    }
    return { backgroundColor: '#0f172a' };
  })();

  const splitStyle: React.CSSProperties = (() => {
    const isVertical = (bg.splitDirection ?? 'vertical') === 'vertical';
    const pos = bg.splitPosition ?? 50;
    const base: React.CSSProperties = {
      position: 'absolute',
      zIndex: 0,
      ...(isVertical
        ? { top: 0, bottom: 0, left: `${pos}%`, right: 0 }
        : { left: 0, right: 0, top: `${pos}%`, bottom: 0 }),
    };
    if (bg.splitBackgroundType === 'solid') {
      return { ...base, backgroundColor: bg.splitBackgroundColor ?? '#1e293b' };
    }
    if (bg.splitBackgroundType === 'gradient') {
      return { ...base, background: bg.splitBackgroundGradient ?? 'linear-gradient(135deg, #1e293b, #0f172a)' };
    }
    if (bg.splitBackgroundType === 'image' && bg.splitBackgroundImage) {
      return {
        ...base,
        backgroundImage: `url(${bg.splitBackgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    return { ...base, backgroundColor: bg.splitBackgroundColor ?? '#1e293b' };
  })();

  const slideStyle: React.CSSProperties = {
    width: `${dims.width}px`,
    height: `${dims.height}px`,
    transform: `scale(${dims.scale})`,
    transformOrigin: 'center center',
    position: 'absolute',
    overflow: 'hidden',
    ...(bg.innerShadow ? { boxShadow: 'inset 0 0 120px rgba(0,0,0,0.7)' } : {}),
    ...bgStyle,
  };

  return (
    <div className="canvas-area">
      <div
        className="slide-container-wrapper"
        style={{
          width: `${dims.width * dims.scale}px`,
          height: `${dims.height * dims.scale}px`,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <div ref={canvasRef} id="capture-slide-node" style={slideStyle}>

          {/* Split background panel */}
          {bg.splitEnabled && (
            <div style={splitStyle} />
          )}

          {/* BG blur layer */}
          {hasBgImage && bg.bgBlur > 0 && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 0,
              backgroundImage: `url(${bg.backgroundImage})`,
              backgroundSize: bg.bgSize,
              backgroundPosition: bg.bgPosition,
              backgroundRepeat: 'no-repeat',
              filter: `blur(${bg.bgBlur}px)`,
              transform: 'scale(1.05)',
              pointerEvents: 'none',
            }} />
          )}

          {/* Flat overlay */}
          {(hasBgImage || bg.backgroundType !== 'solid') && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              backgroundColor: bg.overlayColor,
              opacity: bg.overlayOpacity,
              pointerEvents: 'none',
            }} />
          )}

          {/* Gradient overlay */}
          {bg.overlayGradient && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 2,
              background: bg.overlayGradientValue,
              pointerEvents: 'none',
            }} />
          )}

          {/* Vignette */}
          {bg.vignetteOpacity > 0 && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 3,
              background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${bg.vignetteOpacity}) 100%)`,
              pointerEvents: 'none',
            }} />
          )}

          {/* Elements */}
          {slide.elements.map((el) => {
            const shadowStr = el.textShadow
              ? `0 ${bg.textShadowBlur}px ${bg.textShadowBlur * 2}px ${bg.textShadowColor}`
              : undefined;

            return (
              <div
                key={el.id}
                style={{
                  position: 'absolute',
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: `${el.w}%`,
                  height: `${el.h}%`,
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{
                  width: '100%',
                  color: el.color,
                  fontSize: `${el.fontSize}px`,
                  fontFamily: el.fontFamily,
                  fontWeight: el.bold ? '700' : '400',
                  fontStyle: el.italic ? 'italic' : 'normal',
                  textTransform: el.uppercase ? 'uppercase' : 'none',
                  textAlign: el.textAlign,
                  lineHeight: el.lineHeight,
                  opacity: el.opacity,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  ...(el.rotation !== 0 ? { transform: `rotate(${el.rotation}deg)` } : {}),
                  ...(shadowStr ? { textShadow: shadowStr } : {}),
                  ...(el.isReference ? {
                    fontSize: `${el.fontSize}px`,
                    letterSpacing: '1px',
                    fontWeight: '600',
                  } : {}),
                }}>
                  {el.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
