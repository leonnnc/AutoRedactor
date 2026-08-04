// Bible version type - matches versions available in /public/bibles/
export type BibleVersion = 'rvr1960' | 'nvi' | 'tla' | 'ntv' | 'lbla' | 'dhh' | 'nbla';

// ─── Extra text block (2nd and 3rd text on a slide) ──────────────────────────

export interface TextBlock {
  id: string;
  text: string;
  fontSize: number;
  color: string;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  textShadow: boolean;
}

// ─── Slide style ──────────────────────────────────────────────────────────────

export interface SlideStyle {
  // ── Typography ──────────────────────────────────────────────────────────────
  fontSize: number;
  lineHeight: number;
  color: string;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  verticalAlign: 'flex-start' | 'center' | 'flex-end';
  horizontalAlign: 'flex-start' | 'center' | 'flex-end';
  bold: boolean;
  italic: boolean;
  uppercase: boolean;

  // ── Text shadow ──────────────────────────────────────────────────────────────
  textShadow: boolean;
  textShadowColor: string;
  textShadowBlur: number;

  // ── Background ───────────────────────────────────────────────────────────────
  backgroundType: 'solid' | 'gradient' | 'image';
  backgroundColor: string;
  backgroundGradient: string;
  backgroundImage: string;

  // Image background controls
  bgPosition: 'center' | 'top' | 'bottom' | 'left' | 'right';
  bgSize: 'cover' | 'contain' | 'auto';
  bgBlur: number;           // 0–20 px blur on the bg image

  // ── Overlay ──────────────────────────────────────────────────────────────────
  overlayOpacity: number;
  overlayColor: string;
  overlayGradient: boolean;                          // use gradient overlay instead of flat
  overlayGradientValue: string;                      // e.g. "linear-gradient(to top, ...)"

  // ── Slide shadow effects ──────────────────────────────────────────────────────
  vignetteOpacity: number;  // 0 = off, 0.1–1 = strength of radial dark border
  innerShadow: boolean;     // inset box-shadow on slide edges

  // ── Padding ──────────────────────────────────────────────────────────────────
  paddingX: number;
  paddingY: number;

  // ── Reference (Bible verse citation) ─────────────────────────────────────────
  refColor: string;
  refFontSize: number;
  refItalic: boolean;
  refPosition: 'top' | 'bottom';
}

// ─── Slide ───────────────────────────────────────────────────────────────────

export interface Slide {
  id: string;
  text: string;
  reference: string;
  isVerse: boolean;
  extraBlocks: TextBlock[];           // up to 2 additional text blocks
  customStyle?: Partial<SlideStyle>;
}

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
