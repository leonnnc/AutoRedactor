import type { Slide, CanvasElement, SlideBackground, BibleData } from '../types';
import { norm } from './bibleAbbreviations';

export const KNOWN_VERSIONS = [
  'rvr1960', 'nvi', 'tla', 'ntv', 'lbla', 'dhh', 'nbla',
  'rv1960', 'dhh94i', 'dhhs94',
] as const;

export type KnownVersion = (typeof KNOWN_VERSIONS)[number];

// ─── Default background ───────────────────────────────────────────────────────

export const DEFAULT_BACKGROUND: SlideBackground = {
  backgroundType: 'gradient',
  backgroundColor: '#1e1b4b',
  backgroundGradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)',
  backgroundImage: '',
  bgPosition: 'center',
  bgSize: 'cover',
  bgBlur: 0,
  overlayOpacity: 0.4,
  overlayColor: '#000000',
  overlayGradient: false,
  overlayGradientValue: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)',
  vignetteOpacity: 0,
  innerShadow: false,
  textShadowColor: 'rgba(0,0,0,0.75)',
  textShadowBlur: 6,
};

// ─── Element factories ────────────────────────────────────────────────────────

export const makeTextElement = (
  text: string,
  opts: Partial<CanvasElement> = {},
): CanvasElement => ({
  id: crypto.randomUUID(),
  type: 'text',
  x: 5,
  y: 30,
  w: 90,
  h: 40,
  text,
  isReference: false,
  fontSize: 64,
  fontFamily: "'Playfair Display', serif",
  color: '#ffffff',
  bold: false,
  italic: false,
  uppercase: false,
  textAlign: 'center',
  lineHeight: 1.4,
  textShadow: true,
  opacity: 1,
  rotation: 0,
  ...opts,
});

export const makeReferenceElement = (
  reference: string,
  opts: Partial<CanvasElement> = {},
): CanvasElement => ({
  id: crypto.randomUUID(),
  type: 'text',
  x: 5,
  y: 76,
  w: 90,
  h: 12,
  text: reference,
  isReference: true,
  fontSize: 64,           // rendered at 55% via isReference flag
  fontFamily: "'Playfair Display', serif",
  color: '#fde047',
  bold: true,
  italic: true,
  uppercase: true,
  textAlign: 'center',
  lineHeight: 1.2,
  textShadow: true,
  opacity: 0.9,
  rotation: 0,
  ...opts,
});

export const makeDefaultSlide = (): Slide => ({
  id: crypto.randomUUID(),
  isVerse: false,
  elements: [makeTextElement('Nueva Diapositiva')],
  background: { ...DEFAULT_BACKGROUND },
});

// ─── Text helpers ─────────────────────────────────────────────────────────────

export const splitLongTextIntoChunks = (text: string, maxLength = 280): string[] => {
  if (text.length <= maxLength) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [text];
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    const t = s.trim();
    if (!t) continue;
    if ((cur + ' ' + t).trim().length <= maxLength) {
      cur = (cur + ' ' + t).trim();
    } else {
      if (cur) chunks.push(cur);
      if (t.length > maxLength) {
        const words = t.split(/\s+/);
        let tmp = '';
        for (const w of words) {
          if ((tmp + ' ' + w).trim().length <= maxLength) { tmp = (tmp + ' ' + w).trim(); }
          else { if (tmp) chunks.push(tmp); tmp = w; }
        }
        cur = tmp;
      } else { cur = t; }
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
};

export const splitCustomTextByVerses = (text: string, start: number, end: number): string[] => {
  const results: string[] = [];
  const currentText = text.trim();
  const splitIndices: { verse: number; index: number }[] = [];
  let lastSearchIndex = 0;

  for (let v = start; v <= end; v++) {
    const searchSub = currentText.substring(lastSearchIndex);
    const regex = new RegExp(`(?:^|[\\s.,;()\\u00a0\\[\\]"'])(${v})(?:[\\s.,;()\\u00a0\\[\\]"']|$)`, 'm');
    const match = searchSub.match(regex);
    if (match && match.index !== undefined) {
      const offset = match.index + match[0].indexOf(String(v));
      const absIdx = lastSearchIndex + offset;
      splitIndices.push({ verse: v, index: absIdx });
      lastSearchIndex = absIdx + String(v).length;
    }
  }

  if (splitIndices.length > 0) {
    splitIndices.sort((a, b) => a.index - b.index);
    for (let i = 0; i < splitIndices.length; i++) {
      const cur = splitIndices[i];
      const nxt = splitIndices[i + 1];
      let verseText = currentText.substring(cur.index, nxt ? nxt.index : currentText.length).trim();
      verseText = verseText.replace(/^[:\s\-()[\]"'.]+/g, '');
      results.push(verseText);
    }
  }
  return results;
};

// ─── Fuzzy book matching ──────────────────────────────────────────────────────

const levenshtein = (a: string, b: string): number => {
  const m = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) m[i][0] = i;
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      m[i][j] = a[i-1] === b[j-1] ? m[i-1][j-1]
        : Math.min(m[i-1][j] + 1, m[i][j-1] + 1, m[i-1][j-1] + 1);
  return m[a.length][b.length];
};

export const findClosestBookName = (name: string, list: string[]): string | null => {
  const nName = norm(name);
  let bestMatch: string | null = null;
  let bestScore = 999;
  for (const item of list) {
    const nItem = norm(item);
    if (nItem === nName) return item;
    if (nItem.includes(nName) || nName.includes(nItem)) return item;
    const score = levenshtein(nName, nItem);
    if (score < 4 && score < bestScore) { bestScore = score; bestMatch = item; }
  }
  return bestMatch;
};

// ─── Operator dialog ──────────────────────────────────────────────────────────

export type AskOperatorFn = (
  title: string, message: string,
  options: { label: string; value: string; variant?: 'primary' | 'secondary' | 'danger' }[],
) => Promise<string>;

// ─── Main parser ──────────────────────────────────────────────────────────────

const REF_REGEX = /((?:[1-3]\s+)?[a-zA-ZáéíóúÁÉÍÓÚñÑ]+)\s+(\d+):(\d+)(?:-(\d+))?(?:\s*(?:["'(\[]\s*)?([a-zA-Z0-9]+)(?:\s*["')\]])?)?/i;

const makeVerseSlide = (text: string, reference: string, bg: SlideBackground): Slide => ({
  id: crypto.randomUUID(),
  isVerse: true,
  background: { ...bg },
  elements: [
    makeTextElement(text, { x: 5, y: 20, w: 90, h: 52 }),
    makeReferenceElement(reference),
  ],
});

const makePlainSlide = (text: string, bg: SlideBackground): Slide => ({
  id: crypto.randomUUID(),
  isVerse: false,
  background: { ...bg },
  elements: [makeTextElement(text, { y: 25, h: 50 })],
});

export const parseSermonIntoSlides = async (
  sermonText: string,
  defaultBibleVersion: string,
  fetchBibleVersion: (version: string) => Promise<BibleData | null>,
  askOperator: AskOperatorFn,
  baseBg: SlideBackground = DEFAULT_BACKGROUND,
): Promise<Slide[]> => {
  const rawSegments = sermonText.split(/---|\n\s*\n/);

  // Pre-process: merge ref-only segments with following text
  const processedSegments: string[] = [];
  for (let i = 0; i < rawSegments.length; i++) {
    const current = rawSegments[i].trim();
    if (!current) continue;

    let isOnlyRef = false;
    const currentMatch = current.match(REF_REGEX);
    if (currentMatch) {
      let fullMatchText = currentMatch[0];
      if (currentMatch[5] && !KNOWN_VERSIONS.includes(currentMatch[5].toLowerCase() as KnownVersion)) {
        const lastCoords = `${currentMatch[2]}:${currentMatch[3]}` + (currentMatch[4] ? `-${currentMatch[4]}` : '');
        const lastIndex = current.indexOf(lastCoords);
        if (lastIndex !== -1) fullMatchText = current.substring(current.indexOf(currentMatch[1]), lastIndex + lastCoords.length);
      }
      const remainder = current.replace(fullMatchText, '').replace(/^[:\s\-()[\]"']+|[:\s\-()[\]"']+$/g, '').trim();
      if (remainder.length === 0) isOnlyRef = true;
    }

    if (isOnlyRef && i + 1 < rawSegments.length) {
      const next = rawSegments[i + 1].trim();
      if (!next.match(REF_REGEX)) {
        processedSegments.push(current + '\n' + next);
        i++;
        continue;
      }
    }
    processedSegments.push(current);
  }

  const slides: Slide[] = [];

  for (const segment of processedSegments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const match = trimmed.match(REF_REGEX);

    if (match) {
      let bookName = match[1].trim();
      const chapterNum = parseInt(match[2]);
      const verseStart = parseInt(match[3]);
      const verseEnd = match[4] ? parseInt(match[4]) : verseStart;

      let versionFound = '';
      let fullMatchText = match[0];

      if (match[5]) {
        const pv = match[5].toLowerCase();
        if (KNOWN_VERSIONS.includes(pv as KnownVersion)) {
          versionFound = match[5].toUpperCase();
          if (versionFound === 'RV1960') versionFound = 'RVR1960';
        } else {
          const lastCoords = `${chapterNum}:${verseStart}` + (match[4] ? `-${verseEnd}` : '');
          const lastIndex = trimmed.indexOf(lastCoords);
          if (lastIndex !== -1) fullMatchText = trimmed.substring(trimmed.indexOf(bookName), lastIndex + lastCoords.length);
        }
      }

      let slideText = trimmed.replace(fullMatchText, '').trim();
      slideText = slideText.replace(/^[:\s\-()[\]"']+|[:\s\-()[\]"']+$/g, '');

      const finalVersion = versionFound ? versionFound.toLowerCase() : defaultBibleVersion;
      const bible = await fetchBibleVersion(finalVersion);
      let useDb = true;
      let matchedBook = null;

      if (bible) {
        matchedBook = bible.books.find((b) => b.name.toLowerCase() === bookName.toLowerCase());

        if (!matchedBook) {
          const suggestion = findClosestBookName(bookName, bible.books.map((b) => b.name));
          if (suggestion) {
            bookName = suggestion;
            matchedBook = bible.books.find((b) => b.name.toLowerCase() === bookName.toLowerCase());
          } else {
            const choice = await askOperator('Libro No Reconocido ⚠️',
              `El libro "${bookName}" no se encontró. ¿Cómo deseas proceder?`,
              [{ label: 'Tratar como texto', value: 'text_fallback', variant: 'primary' },
               { label: 'Detener', value: 'abort', variant: 'danger' }]);
            if (choice === 'abort') throw new Error('Generación cancelada.');
            useDb = false;
          }
        }

        if (useDb && matchedBook) {
          const actualChapters = matchedBook.chapters.filter((ch) => ch.is_chapter);
          const chapter = actualChapters[chapterNum - 1];

          if (!chapter) {
            const choice = await askOperator('Capítulo Inexistente ⚠️',
              `"${bookName}" solo tiene ${actualChapters.length} capítulos.`,
              [{ label: 'Tratar como texto', value: 'text_fallback', variant: 'primary' },
               { label: 'Detener', value: 'abort', variant: 'danger' }]);
            if (choice === 'abort') throw new Error('Generación cancelada.');
            useDb = false;
          } else {
            const maxVerse = chapter.items.reduce((mx, item) =>
              item.type === 'verse' ? Math.max(mx, ...item.verse_numbers) : mx, 0);
            if (verseStart > maxVerse || verseEnd > maxVerse) {
              const choice = await askOperator('Versículo Inexistente ⚠️',
                `El capítulo ${chapterNum} de "${bookName}" tiene ${maxVerse} versículos.`,
                [{ label: 'Tratar como texto', value: 'text_fallback', variant: 'primary' },
                 { label: 'Detener', value: 'abort', variant: 'danger' }]);
              if (choice === 'abort') throw new Error('Generación cancelada.');
              useDb = false;
            }
          }
        }
      }

      // Multi-verse
      if (verseStart !== verseEnd) {
        const customSplits = slideText ? splitCustomTextByVerses(slideText, verseStart, verseEnd) : [];
        const rangeVerses: { text: string; num: number }[] = [];

        for (let v = verseStart; v <= verseEnd; v++) {
          let vText = customSplits[v - verseStart] || '';
          if (!vText && useDb && bible && matchedBook) {
            const ch = matchedBook.chapters.filter((c) => c.is_chapter)[chapterNum - 1];
            const vItem = ch?.items.find((i) => i.type === 'verse' && i.verse_numbers.includes(v));
            if (vItem) vText = `${v} ${vItem.lines.join(' ')}`;
          }
          if (!vText) vText = slideText || `Versículo ${v}`;
          const prefix = `${v}`;
          if (!new RegExp(`^${prefix}(?:[\\s.,]|$)`).test(vText.trim())) vText = `${prefix} ${vText.trim()}`;
          rangeVerses.push({ text: vText, num: v });
        }

        const combined = rangeVerses.map((r) => r.text).join(' ');
        const refRange = `${bookName} ${chapterNum}:${verseStart}-${verseEnd} (${finalVersion.toUpperCase()})`;

        if (combined.length <= 260) {
          for (const chunk of splitLongTextIntoChunks(combined, 280))
            slides.push(makeVerseSlide(chunk, refRange, baseBg));
        } else {
          for (const rv of rangeVerses)
            for (const chunk of splitLongTextIntoChunks(rv.text, 280))
              slides.push(makeVerseSlide(chunk, `${bookName} ${chapterNum}:${rv.num} (${finalVersion.toUpperCase()})`, baseBg));
        }
      } else {
        // Single verse
        let fetchedText = '';
        if (useDb && !slideText && bible && matchedBook) {
          const ch = matchedBook.chapters.filter((c) => c.is_chapter)[chapterNum - 1];
          const vItem = ch?.items.find((i) => i.type === 'verse' && i.verse_numbers.includes(verseStart));
          if (vItem) fetchedText = `${verseStart} ${vItem.lines.join(' ')}`;
        }

        let targetText = slideText || fetchedText || trimmed;
        const prefix = `${verseStart}`;
        if (!new RegExp(`^${prefix}(?:[\\s.,]|$)`).test(targetText.trim()))
          targetText = `${prefix} ${targetText.trim()}`;

        const ref = `${bookName} ${chapterNum}:${verseStart} (${finalVersion.toUpperCase()})`;
        for (const chunk of splitLongTextIntoChunks(targetText, 280))
          slides.push(makeVerseSlide(chunk, ref, baseBg));
      }
    } else {
      // Plain text
      for (const chunk of splitLongTextIntoChunks(trimmed, 280))
        slides.push(makePlainSlide(chunk, baseBg));
    }
  }

  return slides;
};
