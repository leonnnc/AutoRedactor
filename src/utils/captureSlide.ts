import { toJpeg } from 'html-to-image';
import type { Slide, ViewportMode, CustomCanvasSize } from '../types';

// ─── Dimensions ────────────────────────────────────────────────────────────────

export const getViewportDimensions = (mode: ViewportMode, custom?: CustomCanvasSize) => {
  if (mode === 'custom' && custom) {
    return { width: custom.width, height: custom.height, scale: 1 };
  }
  switch (mode) {
    case 'tablet':  return { width: 1024,  height: 768,  scale: 0.703125 };
    case 'mobile':  return { width: 1080,  height: 1920, scale: 0.28125  };
    case 'desktop':
    default:        return { width: 1920,  height: 1080, scale: 0.5      };
  }
};

const px = (v: number) => `${v}px`;

// ─── Full-resolution off-screen renderer ─────────────────────────────────────

export const captureFullResolutionSlide = async (
  slide: Slide,
  _globalStyle: unknown,           // kept for API compat, ignored
  viewportMode: ViewportMode,
  customCanvas?: CustomCanvasSize,
): Promise<string> => {
  const dims = getViewportDimensions(viewportMode, customCanvas);
  const bg = slide.background;
  const hasBgImage = bg.backgroundType === 'image' && !!bg.backgroundImage;

  // ── Off-screen container ────────────────────────────────────────────────────
  const container = document.createElement('div');
  container.style.cssText = `position:absolute;left:-9999px;top:-9999px;overflow:hidden;width:${px(dims.width)};height:${px(dims.height)};`;
  document.body.appendChild(container);

  // ── Slide root ──────────────────────────────────────────────────────────────
  const root = document.createElement('div');
  Object.assign(root.style, {
    width: px(dims.width),
    height: px(dims.height),
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box',
  } as Partial<CSSStyleDeclaration>);

  // Background
  if (bg.backgroundType === 'solid') {
    root.style.backgroundColor = bg.backgroundColor;
  } else if (bg.backgroundType === 'gradient') {
    root.style.background = bg.backgroundGradient;
  } else if (hasBgImage) {
    if (bg.bgBlur > 0) {
      const blurEl = document.createElement('div');
      Object.assign(blurEl.style, {
        position: 'absolute', inset: '0', zIndex: '0',
        backgroundImage: `url(${bg.backgroundImage})`,
        backgroundSize: bg.bgSize,
        backgroundPosition: bg.bgPosition,
        backgroundRepeat: 'no-repeat',
        filter: `blur(${bg.bgBlur}px)`,
        transform: 'scale(1.05)',
      } as Partial<CSSStyleDeclaration>);
      root.appendChild(blurEl);
    } else {
      root.style.backgroundImage = `url(${bg.backgroundImage})`;
      root.style.backgroundSize = bg.bgSize;
      root.style.backgroundPosition = bg.bgPosition;
      root.style.backgroundRepeat = 'no-repeat';
    }
  }

  if (bg.innerShadow) {
    root.style.boxShadow = 'inset 0 0 120px rgba(0,0,0,0.7)';
  }

  // Split background panel
  if (bg.splitEnabled) {
    const isVertical = (bg.splitDirection ?? 'vertical') === 'vertical';
    const pos = bg.splitPosition ?? 50;
    const splitEl = document.createElement('div');
    Object.assign(splitEl.style, {
      position: 'absolute',
      zIndex: '0',
      ...(isVertical
        ? { top: '0', bottom: '0', left: `${pos}%`, right: '0' }
        : { left: '0', right: '0', top: `${pos}%`, bottom: '0' }),
    } as Partial<CSSStyleDeclaration>);

    if (bg.splitBackgroundType === 'solid') {
      splitEl.style.backgroundColor = bg.splitBackgroundColor ?? '#1e293b';
    } else if (bg.splitBackgroundType === 'gradient') {
      splitEl.style.background = bg.splitBackgroundGradient ?? 'linear-gradient(135deg, #1e293b, #0f172a)';
    } else if (bg.splitBackgroundType === 'image' && bg.splitBackgroundImage) {
      splitEl.style.backgroundImage = `url(${bg.splitBackgroundImage})`;
      splitEl.style.backgroundSize = 'cover';
      splitEl.style.backgroundPosition = 'center';
      splitEl.style.backgroundRepeat = 'no-repeat';
    } else {
      splitEl.style.backgroundColor = bg.splitBackgroundColor ?? '#1e293b';
    }
    root.appendChild(splitEl);
  }

  // Flat overlay
  if (hasBgImage || bg.backgroundType !== 'solid') {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'absolute', inset: '0', zIndex: '1',
      backgroundColor: bg.overlayColor,
      opacity: String(bg.overlayOpacity),
    } as Partial<CSSStyleDeclaration>);
    root.appendChild(overlay);
  }

  // Gradient overlay
  if (bg.overlayGradient) {
    const gradOverlay = document.createElement('div');
    Object.assign(gradOverlay.style, {
      position: 'absolute', inset: '0', zIndex: '2',
      background: bg.overlayGradientValue,
    } as Partial<CSSStyleDeclaration>);
    root.appendChild(gradOverlay);
  }

  // Vignette
  if (bg.vignetteOpacity > 0) {
    const vignette = document.createElement('div');
    Object.assign(vignette.style, {
      position: 'absolute', inset: '0', zIndex: '3',
      background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${bg.vignetteOpacity}) 100%)`,
    } as Partial<CSSStyleDeclaration>);
    root.appendChild(vignette);
  }

  // ── Elements ────────────────────────────────────────────────────────────────
  for (const el of slide.elements) {
    if (!el.text.trim()) continue;

    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      position: 'absolute',
      left: `${el.x}%`,
      top: `${el.y}%`,
      width: `${el.w}%`,
      height: `${el.h}%`,
      zIndex: '10',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      boxSizing: 'border-box',
    } as Partial<CSSStyleDeclaration>);

    const shadowStr = el.textShadow
      ? `0 ${bg.textShadowBlur}px ${bg.textShadowBlur * 2}px ${bg.textShadowColor}`
      : undefined;

    const inner = document.createElement('div');
    // fontSize stored in preview-px — scale up to full-res by dividing by preview scale
    const fullResFontSize = el.fontSize / dims.scale;
    Object.assign(inner.style, {
      width: '100%',
      color: el.color,
      fontSize: px(el.isReference ? fullResFontSize * 0.55 : fullResFontSize),
      fontFamily: el.fontFamily,
      fontWeight: el.bold ? '700' : '400',
      fontStyle: el.italic ? 'italic' : 'normal',
      textTransform: el.uppercase ? 'uppercase' : 'none',
      textAlign: el.textAlign,
      lineHeight: String(el.lineHeight),
      opacity: String(el.opacity),
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      ...(el.isReference ? { letterSpacing: '1px' } : {}),
      ...(el.rotation !== 0 ? { transform: `rotate(${el.rotation}deg)` } : {}),
      ...(shadowStr ? { textShadow: shadowStr } : {}),
    } as Partial<CSSStyleDeclaration>);

    inner.innerText = el.text;
    wrapper.appendChild(inner);
    root.appendChild(wrapper);
  }

  container.appendChild(root);

  // Allow paint tick
  await new Promise<void>((r) => setTimeout(r, 30));

  try {
    return await toJpeg(root, { width: dims.width, height: dims.height, quality: 0.95 });
  } finally {
    document.body.removeChild(container);
  }
};

// ─── Batch helper ─────────────────────────────────────────────────────────────

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
