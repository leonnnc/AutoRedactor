import { toJpeg } from 'html-to-image';
import type { Slide, SlideStyle, ViewportMode, CustomCanvasSize } from '../types';

export const getViewportDimensions = (mode: ViewportMode, custom?: CustomCanvasSize) => {
  if (mode === 'custom' && custom) {
    return { width: custom.width, height: custom.height, scale: 1 };
  }
  switch (mode) {
    case 'tablet':
      return { width: 1024, height: 768, scale: 0.703125 };
    case 'mobile':
      return { width: 1080, height: 1920, scale: 0.28125 };
    case 'desktop':
    default:
      return { width: 1920, height: 1080, scale: 0.5 };
  }
};

const px = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);

const applyTextStyles = (
  el: HTMLDivElement,
  opts: {
    color: string;
    fontSize: number;
    fontFamily: string;
    bold: boolean;
    italic: boolean;
    uppercase: boolean;
    textAlign: string;
    lineHeight: number | string;
    textShadow?: string;
    whiteSpace?: string;
  },
) => {
  Object.assign(el.style, {
    color: opts.color,
    fontSize: px(opts.fontSize),
    fontFamily: opts.fontFamily,
    fontWeight: opts.bold ? '700' : '400',
    fontStyle: opts.italic ? 'italic' : 'normal',
    textTransform: opts.uppercase ? 'uppercase' : 'none',
    textAlign: opts.textAlign,
    lineHeight: String(opts.lineHeight),
    whiteSpace: opts.whiteSpace ?? 'pre-wrap',
    wordBreak: 'break-word',
    ...(opts.textShadow ? { textShadow: opts.textShadow } : {}),
  } as Partial<CSSStyleDeclaration>);
};

export const captureFullResolutionSlide = async (
  slide: Slide,
  globalStyle: SlideStyle,
  viewportMode: ViewportMode,
  customCanvas?: CustomCanvasSize,
): Promise<string> => {
  const dims = getViewportDimensions(viewportMode, customCanvas);

  // Merge styles
  const style: SlideStyle = { ...globalStyle, ...(slide.customStyle ?? {}) };

  if (slide.customStyle?.paddingX !== undefined) {
    style.paddingX = slide.customStyle.paddingX;
  } else if (globalStyle.paddingX === 15) {
    style.paddingX = slide.isVerse ? 18 : 10;
  } else {
    style.paddingX = globalStyle.paddingX;
  }

  const hasBgImage = style.backgroundType === 'image' && !!style.backgroundImage;

  // ── Offscreen container ───────────────────────────────────────────────────
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;overflow:hidden;';
  container.style.width = px(dims.width);
  container.style.height = px(dims.height);
  document.body.appendChild(container);

  // ── Slide root ────────────────────────────────────────────────────────────
  const slideEl = document.createElement('div');
  Object.assign(slideEl.style, {
    width: px(dims.width),
    height: px(dims.height),
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
    ...(style.innerShadow ? { boxShadow: 'inset 0 0 120px rgba(0,0,0,0.7)' } : {}),
  } as Partial<CSSStyleDeclaration>);

  // Background
  if (style.backgroundType === 'solid') {
    slideEl.style.backgroundColor = style.backgroundColor;
  } else if (style.backgroundType === 'gradient') {
    slideEl.style.background = style.backgroundGradient;
  } else if (hasBgImage) {
    if (style.bgBlur > 0) {
      // Use a separate blurred bg div; slide root stays transparent
      const bgBlurEl = document.createElement('div');
      Object.assign(bgBlurEl.style, {
        position: 'absolute', inset: '0',
        backgroundImage: `url(${style.backgroundImage})`,
        backgroundSize: style.bgSize,
        backgroundPosition: style.bgPosition,
        backgroundRepeat: 'no-repeat',
        filter: `blur(${style.bgBlur}px)`,
        transform: 'scale(1.05)',
        zIndex: '0',
      } as Partial<CSSStyleDeclaration>);
      slideEl.appendChild(bgBlurEl);
    } else {
      slideEl.style.backgroundImage = `url(${style.backgroundImage})`;
      slideEl.style.backgroundSize = style.bgSize;
      slideEl.style.backgroundPosition = style.bgPosition;
      slideEl.style.backgroundRepeat = 'no-repeat';
    }
  }

  // ── Overlay: flat color ───────────────────────────────────────────────────
  if (hasBgImage || style.backgroundType !== 'solid') {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'absolute', inset: '0', zIndex: '1',
      backgroundColor: style.overlayColor,
      opacity: String(style.overlayOpacity),
    } as Partial<CSSStyleDeclaration>);
    slideEl.appendChild(overlay);
  }

  // ── Overlay: gradient ─────────────────────────────────────────────────────
  if (style.overlayGradient) {
    const gradOverlay = document.createElement('div');
    Object.assign(gradOverlay.style, {
      position: 'absolute', inset: '0', zIndex: '2',
      background: style.overlayGradientValue,
    } as Partial<CSSStyleDeclaration>);
    slideEl.appendChild(gradOverlay);
  }

  // ── Vignette ──────────────────────────────────────────────────────────────
  if (style.vignetteOpacity > 0) {
    const vignette = document.createElement('div');
    Object.assign(vignette.style, {
      position: 'absolute', inset: '0', zIndex: '3',
      background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${style.vignetteOpacity}) 100%)`,
    } as Partial<CSSStyleDeclaration>);
    slideEl.appendChild(vignette);
  }

  // ── Content wrapper ───────────────────────────────────────────────────────
  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, {
    position: 'relative',
    zIndex: '10',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  } as Partial<CSSStyleDeclaration>);

  const shadowStr = style.textShadow
    ? `0 ${style.textShadowBlur}px ${style.textShadowBlur * 2}px ${style.textShadowColor}`
    : undefined;

  const refShadowStr = style.textShadow ? '0 2px 4px rgba(0,0,0,0.5)' : undefined;

  // Reference TOP
  if (style.refPosition === 'top' && slide.reference) {
    const refEl = document.createElement('div');
    refEl.innerText = slide.reference;
    applyTextStyles(refEl, {
      color: style.refColor,
      fontSize: style.refFontSize,
      fontFamily: style.fontFamily,
      bold: true,
      italic: style.refItalic,
      uppercase: true,
      textAlign: style.textAlign,
      lineHeight: 1.2,
      textShadow: refShadowStr,
      whiteSpace: 'normal',
    });
    refEl.style.letterSpacing = '1px';
    wrapper.appendChild(refEl);
  }

  // Main text
  const mainEl = document.createElement('div');
  mainEl.innerText = slide.text;
  applyTextStyles(mainEl, {
    color: style.color,
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    bold: style.bold,
    italic: style.italic,
    uppercase: style.uppercase,
    textAlign: style.textAlign,
    lineHeight: style.lineHeight,
    textShadow: shadowStr,
  });
  wrapper.appendChild(mainEl);

  // Extra blocks
  for (const block of slide.extraBlocks) {
    if (!block.text.trim()) continue;
    const blockEl = document.createElement('div');
    blockEl.innerText = block.text;
    applyTextStyles(blockEl, {
      color: block.color,
      fontSize: block.fontSize,
      fontFamily: block.fontFamily,
      bold: block.bold,
      italic: block.italic,
      uppercase: block.uppercase,
      textAlign: block.textAlign,
      lineHeight: 1.4,
      textShadow: block.textShadow ? shadowStr : undefined,
    });
    wrapper.appendChild(blockEl);
  }

  // Reference BOTTOM
  if (style.refPosition === 'bottom' && slide.reference) {
    const refEl = document.createElement('div');
    refEl.innerText = slide.reference;
    applyTextStyles(refEl, {
      color: style.refColor,
      fontSize: style.refFontSize,
      fontFamily: style.fontFamily,
      bold: true,
      italic: style.refItalic,
      uppercase: true,
      textAlign: style.textAlign,
      lineHeight: 1.2,
      textShadow: refShadowStr,
      whiteSpace: 'normal',
    });
    refEl.style.letterSpacing = '1px';
    wrapper.appendChild(refEl);
  }

  slideEl.appendChild(wrapper);
  container.appendChild(slideEl);

  await new Promise<void>((resolve) => setTimeout(resolve, 30));

  try {
    return await toJpeg(slideEl, {
      width: dims.width,
      height: dims.height,
      quality: 0.95,
    });
  } finally {
    document.body.removeChild(container);
  }
};

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
