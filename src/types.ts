// ─── Bible version ────────────────────────────────────────────────────────────
export type BibleVersion = 'rvr1960' | 'nvi' | 'tla' | 'ntv' | 'lbla' | 'dhh' | 'nbla';

// ─── Canvas element ───────────────────────────────────────────────────────────
// All x/y/w/h are percentages (0–100) of the slide dimensions.

export interface CanvasElement {
  id: string;
  type: 'text';
  // Position & size (% of canvas)
  x: number;      // left edge
  y: number;      // top edge
  w: number;      // width
  h: number;      // height
  // Text content
  text: string;
  isReference: boolean;  // renders as a reference label (small, gold, uppercase)
  // Typography
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  // Effects
  textShadow: boolean;
  opacity: number;    // 0–1
  rotation: number;   // degrees
}

// ─── Slide background style ───────────────────────────────────────────────────
export interface SlideBackground {
  backgroundType: 'solid' | 'gradient' | 'image';
  backgroundColor: string;
  backgroundGradient: string;
  backgroundImage: string;
  bgPosition: 'center' | 'top' | 'bottom' | 'left' | 'right';
  bgSize: 'cover' | 'contain' | 'auto';
  bgBlur: number;
  overlayOpacity: number;
  overlayColor: string;
  overlayGradient: boolean;
  overlayGradientValue: string;
  vignetteOpacity: number;
  innerShadow: boolean;
  // Global text shadow settings (shared by elements that opt-in)
  textShadowColor: string;
  textShadowBlur: number;
  // ── Split / dual background ──────────────────────────────────────────────────
  splitEnabled: boolean;
  splitPosition: number;               // 0–100 (%) along the split axis
  splitDirection: 'vertical' | 'horizontal';
  splitBackgroundType: 'solid' | 'gradient' | 'image';
  splitBackgroundColor: string;
  splitBackgroundGradient: string;
  splitBackgroundImage: string;
  splitBgPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  splitBgSize?: 'cover' | 'contain' | 'auto';
  splitBgBlur?: number;
  splitDividerStyle?: 'none' | 'shadow' | 'border' | 'feather' | 'diagonal';
  splitBorderColor?: string;
  splitBorderWidth?: number;
  splitAngle?: number;                // -30 to 30 deg for diagonal
}

// ─── Slide ────────────────────────────────────────────────────────────────────
export interface Slide {
  id: string;
  isVerse: boolean;
  elements: CanvasElement[];
  background: SlideBackground;
}

// ─── Viewport ─────────────────────────────────────────────────────────────────
export type ViewportMode = 'desktop' | 'tablet' | 'mobile' | 'custom';

export interface CustomCanvasSize {
  width: number;
  height: number;
}

// ─── Bible data ───────────────────────────────────────────────────────────────
export interface BibleChapterItem {
  type: string;
  verse_numbers: number[];
  lines: string[];
}

export interface BibleChapter {
  chapter_usfm: string;
  is_chapter: boolean;
  items: BibleChapterItem[];
}

export interface BibleBook {
  book_usfm: string;
  name: string;
  chapters: BibleChapter[];
}

export interface BibleData {
  version_id: number;
  local_abbreviation: string;
  local_title: string;
  books: BibleBook[];
}

// ─── Kept for backwards compat with parseSermon / exporters ──────────────────
/** @deprecated Use SlideBackground instead */
export type SlideStyle = SlideBackground;
