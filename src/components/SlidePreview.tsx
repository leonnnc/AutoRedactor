import React from 'react';
import type { Slide, SlideStyle, ViewportMode, CustomCanvasSize } from '../types';

interface SlidePreviewProps {
  slide: Slide | null;
  globalStyle: SlideStyle;
  viewportMode: ViewportMode;
  customCanvas?: CustomCanvasSize;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export const getViewportDimensions = (mode: ViewportMode, custom?: CustomCanvasSize) => {
  if (mode === 'custom' && custom) {
    // Scale to fit within ~960px wide in preview
    const maxPreviewW = 960;
    const scale = Math.min(1, maxPreviewW / custom.width);
    return { width: custom.width, height: custom.height, scale };
  }
  switch (mode) {
    case 'desktop':
      return { width: 1920, height: 1080, scale: 0.5 };
    case 'tablet':
      return { width: 1024, height: 768, scale: 0.703125 };
    case 'mobile':
      return { width: 1080, height: 1920, scale: 0.28125 };
  }
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

  // Merge global styles with slide-specific overrides if they exist
  const style: SlideStyle = {
    ...globalStyle,
    ...(slide.customStyle || {}),
  };

  if (slide.customStyle && slide.customStyle.paddingX !== undefined) {
    style.paddingX = slide.customStyle.paddingX;
  } else if (globalStyle.paddingX === 15) {
    style.paddingX = slide.isVerse ? 18 : 10;
  } else {
    style.paddingX = globalStyle.paddingX;
  }

  const dimensions = getViewportDimensions(viewportMode, customCanvas);
  
  // Outer wrapper container size
  const wrapperStyle: React.CSSProperties = {
    width: `${dimensions.width * dimensions.scale}px`,
    height: `${dimensions.height * dimensions.scale}px`,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  // Full-resolution slide element (1920x1080, 1024x768, or 1080x1920)
  const slideStyle: React.CSSProperties = {
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    transform: `scale(${dimensions.scale})`,
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
    
    // Background style
    ...(style.backgroundType === 'solid' && {
      backgroundColor: style.backgroundColor,
      backgroundImage: 'none',
    }),
    ...(style.backgroundType === 'gradient' && {
      background: style.backgroundGradient,
    }),
    ...(style.backgroundType === 'image' && style.backgroundImage && {
      backgroundImage: `url(${style.backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }),
  };

  // Overlay for image background to improve readability
  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: style.overlayColor,
    opacity: style.overlayOpacity,
    zIndex: 1,
    transition: 'opacity 0.2s ease',
  };

  // Content wrapper (above background & overlay)
  const contentWrapperStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    textAlign: style.textAlign,
  };

  // Main text styling
  const textStyle: React.CSSProperties = {
    color: style.color,
    fontSize: `${style.fontSize}px`,
    lineHeight: style.lineHeight,
    fontFamily: style.fontFamily,
    fontWeight: style.bold ? '700' : '400',
    fontStyle: style.italic ? 'italic' : 'normal',
    textTransform: style.uppercase ? 'uppercase' : 'none',
    transition: 'all 0.1s ease',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    ...(style.textShadow && {
      textShadow: `0 ${style.textShadowBlur}px ${style.textShadowBlur * 2}px ${style.textShadowColor}`,
    }),
  };

  // Reference (Bible quote reference) styling
  const referenceStyle: React.CSSProperties = {
    color: style.refColor,
    fontSize: `${style.refFontSize}px`,
    fontFamily: style.fontFamily,
    fontWeight: '600',
    fontStyle: style.refItalic ? 'italic' : 'normal',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    opacity: 0.9,
    ...(style.textShadow && {
      textShadow: `0 2px 4px rgba(0,0,0,0.5)`,
    }),
  };

  return (
    <div className="canvas-area">
      <div className="slide-container-wrapper" style={wrapperStyle}>
        {/* The high-res DOM node that html-to-image will capture */}
        <div 
          ref={canvasRef} 
          id="capture-slide-node" 
          style={slideStyle}
        >
          {style.backgroundType === 'image' && style.backgroundImage && (
            <div style={overlayStyle} />
          )}
          
          <div style={contentWrapperStyle}>
            {style.refPosition === 'top' && slide.reference && (
              <div style={referenceStyle}>{slide.reference}</div>
            )}
            
            <div style={textStyle}>
              {slide.text}
            </div>
            
            {style.refPosition === 'bottom' && slide.reference && (
              <div style={referenceStyle}>{slide.reference}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
