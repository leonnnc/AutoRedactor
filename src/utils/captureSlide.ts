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
    const dividerStyle = bg.splitDividerStyle ?? 'none';
    const angle = bg.splitAngle ?? 0;
    const splitEl = document.createElement('div');

    const splitStyles: Partial<CSSStyleDeclaration> = {
      position: 'absolute',
      zIndex: '0',
    };

    if (dividerStyle === 'diagonal') {
      splitStyles.left = '0';
      splitStyles.right = '0';
      splitStyles.top = '0';
      splitStyles.bottom = '0';
      if (isVertical) {
        const topOffset = Math.max(0, Math.min(100, pos - angle));
        const bottomOffset = Math.max(0, Math.min(100, pos + angle));
        splitStyles.clipPath = `polygon(${topOffset}% 0%, 100% 0%, 100% 100%, ${bottomOffset}% 100%)`;
      } else {
        const leftOffset = Math.max(0, Math.min(100, pos - angle));
        const rightOffset = Math.max(0, Math.min(100, pos + angle));
        splitStyles.clipPath = `polygon(0% ${leftOffset}%, 100% ${rightOffset}%, 100% 100%, 0% 100%)`;
      }
    } else {
      if (isVertical) {
        splitStyles.top = '0';
        splitStyles.bottom = '0';
        splitStyles.left = `${pos}%`;
        splitStyles.right = '0';
      } else {
        splitStyles.left = '0';
        splitStyles.right = '0';
        splitStyles.top = `${pos}%`;
        splitStyles.bottom = '0';
      }

      if (dividerStyle === 'shadow') {
        splitStyles.boxShadow = isVertical
          ? '-16px 0 32px rgba(0, 0, 0, 0.65)'
          : '0 -16px 32px rgba(0, 0, 0, 0.65)';
      } else if (dividerStyle === 'border') {
        const bColor = bg.splitBorderColor ?? '#ffffff';
        const bWidth = bg.splitBorderWidth ?? 2;
        if (isVertical) {
          splitStyles.borderLeft = `${bWidth}px solid ${bColor}`;
        } else {
          splitStyles.borderTop = `${bWidth}px solid ${bColor}`;
        }
      } else if (dividerStyle === 'feather') {
        splitStyles.maskImage = isVertical
          ? 'linear-gradient(to right, transparent 0%, black 18%, black 100%)'
          : 'linear-gradient(to bottom, transparent 0%, black 18%, black 100%)';
        splitStyles.webkitMaskImage = isVertical
          ? 'linear-gradient(to right, transparent 0%, black 18%, black 100%)'
          : 'linear-gradient(to bottom, transparent 0%, black 18%, black 100%)';
      }
    }

    Object.assign(splitEl.style, splitStyles);

    if (bg.splitBackgroundType === 'solid') {
      splitEl.style.backgroundColor = bg.splitBackgroundColor ?? '#1e293b';
    } else if (bg.splitBackgroundType === 'gradient') {
      splitEl.style.background = bg.splitBackgroundGradient ?? 'linear-gradient(135deg, #0f172a, #1e3a5f)';
    } else if (bg.splitBackgroundType === 'image' && bg.splitBackgroundImage) {
      splitEl.style.backgroundImage = `url(${bg.splitBackgroundImage})`;
      splitEl.style.backgroundSize = bg.splitBgSize ?? 'cover';
      splitEl.style.backgroundPosition = bg.splitBgPosition ?? 'center';
      splitEl.style.backgroundRepeat = 'no-repeat';
      if ((bg.splitBgBlur ?? 0) > 0) {
        splitEl.style.filter = `blur(${bg.splitBgBlur}px)`;
      }
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
      justifyContent: 'center',
      overflow: 'hidden',
      boxSizing: 'border-box',
    } as Partial<CSSStyleDeclaration>);

    if (el.type === 'image' && el.src) {
      const img = document.createElement('img');
      img.src = el.src;
      img.crossOrigin = 'anonymous';
      Object.assign(img.style, {
        width: '100%',
        height: '100%',
        objectFit: el.objectFit || 'contain',
        borderRadius: `${el.borderRadius || 0}px`,
        opacity: String(el.opacity ?? 1),
        filter: el.shadow ? 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' : '',
        ...(el.rotation !== 0 ? { transform: `rotate(${el.rotation}deg)` } : {}),
      } as Partial<CSSStyleDeclaration>);
      wrapper.appendChild(img);
      root.appendChild(wrapper);
      continue;
    }

    if (!el.text || !el.text.trim()) continue;

    const shadowStr = el.textShadow
      ? `0 ${bg.textShadowBlur}px ${bg.textShadowBlur * 2}px ${bg.textShadowColor}`
      : undefined;

    const inner = document.createElement('div');
    // fontSize stored in preview-px — scale up to full-res by dividing by preview scale
    const fullResFontSize = (el.fontSize ?? 48) / dims.scale;
    Object.assign(inner.style, {
      width: '100%',
      color: el.color || '#ffffff',
      fontSize: px(el.isReference ? fullResFontSize * 0.55 : fullResFontSize),
      fontFamily: el.fontFamily || "'Playfair Display', serif",
      fontWeight: el.bold ? '700' : '400',
      fontStyle: el.italic ? 'italic' : 'normal',
      textTransform: el.uppercase ? 'uppercase' : 'none',
      textAlign: el.textAlign || 'center',
      lineHeight: String(el.lineHeight || 1.3),
      opacity: String(el.opacity ?? 1),
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
