// Bible version type - matches versions available in /public/bibles/
export type BibleVersion = 'rvr1960' | 'nvi' | 'tla' | 'ntv' | 'lbla' | 'dhh' | 'nbla';

export interface SlideStyle {
  fontSize: number; // in pixels (base desktop size, scaled in preview)
  lineHeight: number; // multiplier, e.g. 1.4
  color: string; // text color
  fontFamily: string; // font family name
  textAlign: 'left' | 'center' | 'right' | 'justify';
  verticalAlign: 'flex-start' | 'center' | 'flex-end';
  horizontalAlign: 'flex-start' | 'center' | 'flex-end';
  textShadow: boolean;
  textShadowColor: string;
  textShadowBlur: number;
  backgroundType: 'solid' | 'gradient' | 'image';
  backgroundColor: string;
  backgroundGradient: string; // linear-gradient CSS string
  backgroundImage: string; // URL or base64 data
  overlayOpacity: number; // 0 to 1
  overlayColor: string; // hex color for background overlay
  paddingX: number; // horizontal padding in percentage
  paddingY: number; // vertical padding in percentage
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
  
  // Reference styling (Bible verses quote styling)
  refColor: string;
  refFontSize: number;
  refItalic: boolean;
  refPosition: 'top' | 'bottom';
}

export interface Slide {
  id: string;
  text: string;
  reference: string; // e.g. "Juan 3:16"
  isVerse: boolean;  // whether it's detected/created as a bible verse
  customStyle?: Partial<SlideStyle>; // optional style override
}

export type ViewportMode = 'desktop' | 'tablet' | 'mobile' | 'custom';

export interface CustomCanvasSize {
  width: number;
  height: number;
}

export interface BibleChapterItem {
  type: string; // "verse" | "heading1" | etc.
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
