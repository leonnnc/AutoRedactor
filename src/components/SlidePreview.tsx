import React from 'react';
import type { Slide, SlideStyle, ViewportMode, CustomCanvasSize } from '../types';
import { getViewportDimensions } from '../utils/captureSlide';

interface SlidePreviewProps {
  slide: Slide | null;
  globalStyle: SlideStyle;
  viewportMode: ViewportMode;
  customCanvas?: CustomCanvasSize;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

const getPreviewDimensions = (mode: ViewportMode, custom?: CustomCanvasSize) => {
  if (mode === 'custom' && custom) {
    const maxPreviewW = 960;
    const scale = Math.min(1, maxPreviewW / custom.width);
    return { width: custom.width, height: custom.height, scale };
  }
  return getViewportDimensions(mode, custom);
};

export const SlidePreview: React.FC<SlidePreviewProps> = ({
  slide,
  globalStyle,
  viewportMode,
  customCanvas,
  canvasRef,
}) => {
  if (!slide) {
    return (
      <div className="canvas-area">
        <div style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
          Selecciona o crea una diapositiva para previsualizar
        </div>
      </div>
    );
  }

  // Merge global + slide-specific overrides
  const style: SlideStyle = {
    ...globalStyle,
    ...(slide.customStyle ?? {}),
  };

  // Padding resolution
  if (slide.customStyle?.paddingX !== undefined) {
    style.paddingX = slide.customStyle.paddingX;
  } else if (globalStyle.paddingX === 15) {
    style.paddingX = slide.isVerse ? 18 : 10;
  } else {
    style.paddingX = globalStyle.paddingX;
  }

  const dims = getPreviewDimensions(viewportMode, customCanvas);

  // ── Slide root ────────────────────────────────────────────────────────────
  const slideStyle: React.CSSProperties = {
    width: `${dims.width}px`,
    height: `${dims.height}px`,
    transform: `scale(${dims.scale})`,
    transformOrigin: 'center center',
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: style.verticalAlign,
    alignItems: style.horizontalAlign,
    paddingLeft: `${style.paddingX}%`,
    paddingRight: `${style.paddingX}%`,
    paddingTop: `${style.paddingY}%`,
    paddingBottom: `${style.paddingY}%`,
    boxSizing: 'border-box',
    overflow: 'hidden',
    transition: 'background 0.3s ease',
    // inner shadow effect
    ...(style.innerShadow && {
      boxShadow: 'inset 0 0 120px rgba(0,0,0,0.7)',
    }),
    // background
    ...(style.backgroundType === 'solid' && {
      backgroundColor: style.backgroundColor,
      backgroundImage: 'none',
    }),
    ...(style.backgroundType === 'gradient' && {
      background: style.backgroundGradient,
    }),
    ...(style.backgroundType === 'image' && style.backgroundImage && {
      backgroundImage: `url(${style.backgroundImage})`,
      backgroundSize: style.bgSize,
      backgroundPosition: style.bgPosition,
      backgroundRepeat: 'no-repeat',
    }),
  };

  // ── Layers ────────────────────────────────────────────────────────────────

  // Background image blur layer (separate div so blur doesn't affect text)
  const hasBgImage = style.backgroundType === 'image' && !!style.backgroundImage;
  const hasBgBlur = hasBgImage && style.bgBlur > 0;

  // Flat color overlay
  const overlayStyle: React.CSSProperties = {
    position: 'absolute', inset: 0, zIndex: 1,
    backgroundColor: style.overlayColor,
    opacity: style.overlayOpacity,
    pointerEvents: 'none',
  };

  // Gradient overlay (over the flat overlay)
  const gradientOverlayStyle: React.CSSProperties = {
    position: 'absolute', inset: 0, zIndex: 2,
    background: style.overlayGradientValue,
    pointerEvents: 'none',
  };

  // Vignette — radial dark border
  const vignetteStyle: React.CSSProperties = {
    position: 'absolute', inset: 0, zIndex: 3,
    background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${style.vignetteOpacity}) 100%)`,
    pointerEvents: 'none',
  };

  // ── Text helpers ──────────────────────────────────────────────────────────

  const mainTextStyle: React.CSSProperties = {
    color: style.color,
    fontSize: `${style.fontSize}px`,
    lineHeight: style.lineHeight,
    fontFamily: style.fontFamily,
    fontWeight: style.bold ? '700' : '400',
    fontStyle: style.italic ? 'italic' : 'normal',
    textTransform: style.uppercase ? 'uppercase' : 'none',
    textAlign: style.textAlign,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    transition: 'all 0.1s ease',
    ...(style.textShadow && {
      textShadow: `0 ${style.textShadowBlur}px ${style.textShadowBlur * 2}px ${style.textShadowColor}`,
    }),
  };

  const referenceStyle: React.CSSProperties = {
    color: style.refColor,
    fontSize: `${style.refFontSize}px`,
    fontFamily: style.fontFamily,
    fontWeight: '600',
    fontStyle: style.refItalic ? 'italic' : 'normal',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    opacity: 0.9,
    textAlign: style.textAlign,
    ...(style.textShadow && {
      textShadow: '0 2px 4px rgba(0,0,0,0.5)',
    }),
  };

  const contentWrapperStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
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

          {/* ── Background blur pseudo-layer ── */}
          {hasBgBlur && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 0,
              backgroundImage: `url(${style.backgroundImage})`,
              backgroundSize: style.bgSize,
              backgroundPosition: style.bgPosition,
              backgroundRepeat: 'no-repeat',
              filter: `blur(${style.bgBlur}px)`,
              transform: 'scale(1.05)', // hide blur edges
              pointerEvents: 'none',
            }} />
          )}

          {/* ── Overlays ── */}
          {(hasBgImage || style.backgroundType !== 'solid') && (
            <div style={overlayStyle} />
          )}
          {style.overlayGradient && (
            <div style={gradientOverlayStyle} />
          )}
          {style.vignetteOpacity > 0 && (
            <div style={vignetteStyle} />
          )}

          {/* ── Content ── */}
          <div style={contentWrapperStyle}>
            {style.refPosition === 'top' && slide.reference && (
              <div style={referenceStyle}>{slide.reference}</div>
            )}

            <div style={mainTextStyle}>{slide.text}</div>

            {/* Extra text blocks */}
            {slide.extraBlocks.map((block) => (
              <div
                key={block.id}
                style={{
                  color: block.color,
                  fontSize: `${block.fontSize}px`,
                  fontFamily: block.fontFamily,
                  fontWeight: block.bold ? '700' : '400',
                  fontStyle: block.italic ? 'italic' : 'normal',
                  textTransform: block.uppercase ? 'uppercase' : 'none',
                  textAlign: block.textAlign,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.4,
                  ...(block.textShadow && {
                    textShadow: `0 ${style.textShadowBlur}px ${style.textShadowBlur * 2}px ${style.textShadowColor}`,
                  }),
                }}
              >
                {block.text}
              </div>
            ))}

            {style.refPosition === 'bottom' && slide.reference && (
              <div style={referenceStyle}>{slide.reference}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
