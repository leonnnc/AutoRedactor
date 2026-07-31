import { toJpeg } from 'html-to-image';
import type { Slide, SlideStyle, ViewportMode, CustomCanvasSize } from '../types';

export const getViewportDimensions = (mode: ViewportMode, custom?: CustomCanvasSize) => {
  if (mode === 'custom' && custom) {
    return { width: custom.width, height: custom.height, scale: 1 };
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

/**
 * Renders a slide off-screen at full resolution and returns a JPEG data URL.
 * The created DOM node is always removed from the document, even on error.
 */
export const captureFullResolutionSlide = async (
  slide: Slide,
  globalStyle: SlideStyle,
  viewportMode: ViewportMode,
  customCanvas?: CustomCanvasSize,
): Promise<string> => {
  const dims = getViewportDimensions(viewportMode, customCanvas);

  // Merge global and slide-specific style
  const style: SlideStyle = {
    ...globalStyle,
    ...(slide.customStyle ?? {}),
  };

  // Apply padding logic
  if (slide.customStyle?.paddingX !== undefined) {
    style.paddingX = slide.customStyle.paddingX;
  } else if (globalStyle.paddingX === 15) {
    style.paddingX = slide.isVerse ? 18 : 10;
  } else {
    style.paddingX = globalStyle.paddingX;
  }

  // Off-screen sandbox container
  const container = document.createElement('div');
  container.style.cssText =
    'position:absolute;left:-9999px;top:-9999px;';
  container.style.width = `${dims.width}px`;
  container.style.height = `${dims.height}px`;
  document.body.appendChild(container);

  const slideEl = document.createElement('div');
  Object.assign(slideEl.style, {
    width: `${dims.width}px`,
    height: `${dims.height}px`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: style.verticalAlign,
    alignItems: style.horizontalAlign,
    paddingLeft: `${style.paddingX}%`,
    paddingRight: `${style.paddingX}%`,
    paddingTop: `${style.paddingY}%`,
    paddingBottom: `${style.paddingY}%`,
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
  } as Partial<CSSStyleDeclaration>);

  // Background
  if (style.backgroundType === 'solid') {
    slideEl.style.backgroundColor = style.backgroundColor;
  } else if (style.backgroundType === 'gradient') {
    slideEl.style.background = style.backgroundGradient;
  } else if (style.backgroundType === 'image' && style.backgroundImage) {
    slideEl.style.backgroundImage = `url(${style.backgroundImage})`;
    slideEl.style.backgroundSize = 'cover';
    slideEl.style.backgroundPosition = 'center';
    slideEl.style.backgroundRepeat = 'no-repeat';
  }

  // Overlay (image backgrounds only)
  if (style.backgroundType === 'image' && style.backgroundImage) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:absolute;inset:0;z-index:1;
      background-color:${style.overlayColor};
      opacity:${style.overlayOpacity};
    `;
    slideEl.appendChild(overlay);
  }

  // Content wrapper
  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, {
    position: 'relative',
    zIndex: '2',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    textAlign: style.textAlign,
  } as Partial<CSSStyleDeclaration>);

  // Reference element
  const refDiv = document.createElement('div');
  refDiv.innerText = slide.reference;
  Object.assign(refDiv.style, {
    color: style.refColor,
    fontSize: `${style.refFontSize}px`,
    fontFamily: style.fontFamily,
    fontWeight: '600',
    fontStyle: style.refItalic ? 'italic' : 'normal',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    ...(style.textShadow && {
      textShadow: '0 2px 4px rgba(0,0,0,0.5)',
    }),
  } as Partial<CSSStyleDeclaration>);

  // Main text element
  const textDiv = document.createElement('div');
  textDiv.innerText = slide.text;
  Object.assign(textDiv.style, {
    color: style.color,
    fontSize: `${style.fontSize}px`,
    lineHeight: String(style.lineHeight),
    fontFamily: style.fontFamily,
    fontWeight: style.bold ? '700' : '400',
    fontStyle: style.italic ? 'italic' : 'normal',
    textTransform: style.uppercase ? 'uppercase' : 'none',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    ...(style.textShadow && {
      textShadow: `0 ${style.textShadowBlur}px ${style.textShadowBlur * 2}px ${style.textShadowColor}`,
    }),
  } as Partial<CSSStyleDeclaration>);

  // Order elements based on reference position
  if (slide.reference) {
    if (style.refPosition === 'top') {
      wrapper.appendChild(refDiv);
      wrapper.appendChild(textDiv);
    } else {
      wrapper.appendChild(textDiv);
      wrapper.appendChild(refDiv);
    }
  } else {
    wrapper.appendChild(textDiv);
  }

  slideEl.appendChild(wrapper);
  container.appendChild(slideEl);

  // Allow the browser one tick to paint
  await new Promise<void>((resolve) => setTimeout(resolve, 30));

  try {
    const dataUrl = await toJpeg(slideEl, {
      width: dims.width,
      height: dims.height,
      quality: 0.95,
    });
    return dataUrl;
  } finally {
    document.body.removeChild(container);
  }
};

/**
 * Runs an async task over an array in batches of `batchSize` to avoid
 * saturating the main thread when processing many slides.
 */
export const processInBatches = async <T, R>(
  items: T[],
  batchSize: number,
  task: (item: T, index: number) => Promise<R>,
  onProgress?: (completed: number, total: number) => void,
): Promise<R[]> => {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, j) => task(item, i + j)),
    );
    results.push(...batchResults);
    onProgress?.(Math.min(i + batchSize, items.length), items.length);
  }
  return results;
};
