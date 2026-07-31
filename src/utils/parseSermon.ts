import type { Slide, BibleData } from '../types';
import { norm } from './bibleAbbreviations';

export const KNOWN_VERSIONS = [
  'rvr1960', 'nvi', 'tla', 'ntv', 'lbla', 'dhh', 'nbla',
  'rv1960', 'dhh94i', 'dhhs94',
] as const;

export type KnownVersion = (typeof KNOWN_VERSIONS)[number];

// ─── Text helpers ────────────────────────────────────────────────────────────

export const splitCustomTextByVerses = (
  text: string,
  start: number,
  end: number,
): string[] => {
  const results: string[] = [];
  const currentText = text.trim();

  const splitIndices: { verse: number; index: number }[] = [];
  let lastSearchIndex = 0;

  for (let v = start; v <= end; v++) {
    const searchSub = currentText.substring(lastSearchIndex);
    const regex = new RegExp(
      `(?:^|[\\s.,;()\\u00a0\\[\\]"'])(${v})(?:[\\s.,;()\\u00a0\\[\\]"']|$)`,
      'm',
    );
    const match = searchSub.match(regex);

    if (match && match.index !== undefined) {
      const matchedNumOffset = match.index + match[0].indexOf(String(v));
      const absoluteIndex = lastSearchIndex + matchedNumOffset;
      splitIndices.push({ verse: v, index: absoluteIndex });
      lastSearchIndex = absoluteIndex + String(v).length;
    }
  }

  if (splitIndices.length > 0) {
    splitIndices.sort((a, b) => a.index - b.index);

    for (let i = 0; i < splitIndices.length; i++) {
      const current = splitIndices[i];
      const next = splitIndices[i + 1];
      const textStart = current.index;
      const textEnd = next ? next.index : currentText.length;
      let verseText = currentText.substring(textStart, textEnd).trim();
      verseText = verseText.replace(/^[:\s\-()[\]"'.]+/g, '');
      results.push(verseText);
    }
  }

  return results;
};

export const splitLongTextIntoChunks = (
  text: string,
  maxLength = 280,
): string[] => {
  if (text.length <= maxLength) return [text];

  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    if ((currentChunk + ' ' + trimmedSentence).trim().length <= maxLength) {
      currentChunk = (currentChunk + ' ' + trimmedSentence).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);

      if (trimmedSentence.length > maxLength) {
        const words = trimmedSentence.split(/\s+/);
        let temp = '';
        for (const word of words) {
          if ((temp + ' ' + word).trim().length <= maxLength) {
            temp = (temp + ' ' + word).trim();
          } else {
            if (temp) chunks.push(temp);
            temp = word;
          }
        }
        currentChunk = temp;
      } else {
        currentChunk = trimmedSentence;
      }
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
};

// ─── Fuzzy book name matching ─────────────────────────────────────────────────

const levenshteinDistance = (a: string, b: string): number => {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1, // substitution
        );
      }
    }
  }
  return matrix[a.length][b.length];
};

export const findClosestBookName = (
  name: string,
  list: string[],
): string | null => {
  const nName = norm(name);

  let bestMatch: string | null = null;
  let bestScore = 999;

  for (const item of list) {
    const nItem = norm(item);
    if (nItem === nName) return item;
    if (nItem.includes(nName) || nName.includes(nItem)) return item;

    const score = levenshteinDistance(nName, nItem);
    if (score < 4 && score < bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  return bestMatch;
};

// ─── Operator dialog contract ─────────────────────────────────────────────────

export type AskOperatorFn = (
  title: string,
  message: string,
  options: {
    label: string;
    value: string;
    variant?: 'primary' | 'secondary' | 'danger';
  }[],
) => Promise<string>;

// ─── Main parser ─────────────────────────────────────────────────────────────

/** Regex that matches Spanish Bible references (handles numbered books, accents, optional version). */
const REF_REGEX =
  /((?:[1-3]\s+)?[a-zA-ZáéíóúÁÉÍÓÚñÑ]+)\s+(\d+):(\d+)(?:-(\d+))?(?:\s*(?:["'(\[]\s*)?([a-zA-Z0-9]+)(?:\s*["')\]])?)?/i;

export const parseSermonIntoSlides = async (
  sermonText: string,
  defaultBibleVersion: string,
  fetchBibleVersion: (version: string) => Promise<BibleData | null>,
  askOperator: AskOperatorFn,
): Promise<Slide[]> => {
  // Split by double line break or manual page break '---'
  const rawSegments = sermonText.split(/---|\n\s*\n/);

  // Pre-process: merge reference-only segments with the following text segment
  const processedSegments: string[] = [];
  for (let i = 0; i < rawSegments.length; i++) {
    const current = rawSegments[i].trim();
    if (!current) continue;

    let isOnlyRef = false;
    const currentMatch = current.match(REF_REGEX);
    if (currentMatch) {
      let fullMatchText = currentMatch[0];
      if (
        currentMatch[5] &&
        !KNOWN_VERSIONS.includes(
          currentMatch[5].toLowerCase() as KnownVersion,
        )
      ) {
        const lastCoords =
          `${currentMatch[2]}:${currentMatch[3]}` +
          (currentMatch[4] ? `-${currentMatch[4]}` : '');
        const lastIndex = current.indexOf(lastCoords);
        if (lastIndex !== -1) {
          fullMatchText = current.substring(
            current.indexOf(currentMatch[1]),
            lastIndex + lastCoords.length,
          );
        }
      }
      const remainder = current
        .replace(fullMatchText, '')
        .replace(/^[:\s\-()[\]"']+|[:\s\-()[\]"']+$/g, '')
        .trim();
      if (remainder.length === 0) isOnlyRef = true;
    }

    if (isOnlyRef && i + 1 < rawSegments.length) {
      const next = rawSegments[i + 1].trim();
      const nextMatch = next.match(REF_REGEX);
      if (!nextMatch) {
        processedSegments.push(current + '\n' + next);
        i++;
        continue;
      }
    }

    processedSegments.push(current);
  }

  const parsedSlides: Slide[] = [];

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
        const potentialVersion = match[5].toLowerCase();
        if (KNOWN_VERSIONS.includes(potentialVersion as KnownVersion)) {
          versionFound = match[5].toUpperCase();
          if (versionFound === 'RV1960') versionFound = 'RVR1960';
        } else {
          const lastCoords =
            `${chapterNum}:${verseStart}` +
            (match[4] ? `-${verseEnd}` : '');
          const lastIndex = trimmed.indexOf(lastCoords);
          if (lastIndex !== -1) {
            fullMatchText = trimmed.substring(
              trimmed.indexOf(bookName),
              lastIndex + lastCoords.length,
            );
          }
        }
      }

      let slideText = trimmed.replace(fullMatchText, '').trim();
      slideText = slideText.replace(
        /^[:\s\-()[\]"']+|[:\s\-()[\]"']+$/g,
        '',
      );

      const finalVersion = versionFound
        ? versionFound.toLowerCase()
        : defaultBibleVersion;
      const bible = await fetchBibleVersion(finalVersion);

      let useDb = true;
      let matchedBook = null;

      if (bible) {
        matchedBook = bible.books.find(
          (b) => b.name.toLowerCase() === bookName.toLowerCase(),
        );

        if (!matchedBook) {
          const allBookNames = bible.books.map((b) => b.name);
          const suggestion = findClosestBookName(bookName, allBookNames);

          if (suggestion) {
            bookName = suggestion;
            matchedBook = bible.books.find(
              (b) => b.name.toLowerCase() === bookName.toLowerCase(),
            );
          } else {
            const choice = await askOperator(
              'Libro No Reconocido ⚠️',
              `El libro "${bookName}" no se encontró en la versión ${finalVersion.toUpperCase()} y no pudimos identificar a cuál correspondía.\n¿Cómo deseas proceder?`,
              [
                { label: 'Tratar como texto normal', value: 'text_fallback', variant: 'primary' },
                { label: 'Detener generación', value: 'abort', variant: 'danger' },
              ],
            );
            if (choice === 'abort') throw new Error('Generación cancelada por el operador para corregir el texto.');
            useDb = false;
          }
        }

        if (useDb && matchedBook) {
          const actualChapters = matchedBook.chapters.filter(
            (ch) => ch.is_chapter,
          );
          const chapter = actualChapters[chapterNum - 1];

          if (!chapter) {
            const choice = await askOperator(
              'Capítulo Inexistente ⚠️',
              `El libro "${bookName}" solo tiene ${actualChapters.length} capítulos. Intentaste buscar el capítulo ${chapterNum}.\n¿Cómo deseas proceder?`,
              [
                { label: 'Tratar como texto normal', value: 'text_fallback', variant: 'primary' },
                { label: 'Detener generación', value: 'abort', variant: 'danger' },
              ],
            );
            if (choice === 'abort') throw new Error('Generación cancelada para corregir el capítulo.');
            useDb = false;
          } else {
            const maxVerseInChapter = chapter.items.reduce((max, item) => {
              if (item.type === 'verse') {
                const itemMax = Math.max(...item.verse_numbers);
                return itemMax > max ? itemMax : max;
              }
              return max;
            }, 0);

            if (
              verseStart > maxVerseInChapter ||
              verseEnd > maxVerseInChapter
            ) {
              const choice = await askOperator(
                'Versículo Inexistente ⚠️',
                `El capítulo ${chapterNum} de "${bookName}" tiene ${maxVerseInChapter} versículos. Intentaste buscar el versículo ${verseStart > maxVerseInChapter ? verseStart : verseEnd}.\n¿Cómo deseas proceder?`,
                [
                  { label: 'Tratar como texto normal', value: 'text_fallback', variant: 'primary' },
                  { label: 'Detener generación', value: 'abort', variant: 'danger' },
                ],
              );
              if (choice === 'abort') throw new Error('Generación cancelada para corregir el versículo.');
              useDb = false;
            }
          }
        }
      }

      if (verseStart !== verseEnd) {
        // Multi-verse range
        let customSplitTexts: string[] = [];
        if (slideText) {
          customSplitTexts = splitCustomTextByVerses(
            slideText,
            verseStart,
            verseEnd,
          );
        }

        const rangeVerses: { text: string; num: number }[] = [];
        for (let v = verseStart; v <= verseEnd; v++) {
          let verseText = '';
          const customIdx = v - verseStart;

          if (
            slideText &&
            customSplitTexts.length > customIdx &&
            customSplitTexts[customIdx]
          ) {
            verseText = customSplitTexts[customIdx];
          }

          if (!verseText && useDb && bible && matchedBook) {
            const actualChapters = matchedBook.chapters.filter(
              (ch) => ch.is_chapter,
            );
            const chapter = actualChapters[chapterNum - 1];
            if (chapter) {
              const vItem = chapter.items.find(
                (item) =>
                  item.type === 'verse' && item.verse_numbers.includes(v),
              );
              if (vItem) verseText = `${v} ${vItem.lines.join(' ')}`;
            }
          }

          if (!verseText) verseText = slideText || `Versículo ${v}`;

          const vPrefix = `${v}`;
          const vTrimmed = verseText.trim();
          const startsWithVNum = new RegExp(
            `^${vPrefix}(?:[\\s.,;()\\u00a0\\[\\]"']|$)`,
          );
          verseText = startsWithVNum.test(vTrimmed)
            ? vTrimmed
            : `${vPrefix} ${vTrimmed}`;

          rangeVerses.push({ text: verseText, num: v });
        }

        const combinedText = rangeVerses.map((rv) => rv.text).join(' ');

        if (combinedText.length <= 260) {
          for (const chunk of splitLongTextIntoChunks(combinedText, 280)) {
            parsedSlides.push({
              id: crypto.randomUUID(),
              text: chunk,
              reference: `${bookName} ${chapterNum}:${verseStart}-${verseEnd} (${finalVersion.toUpperCase()})`,
              isVerse: true,
            });
          }
        } else {
          for (const rv of rangeVerses) {
            for (const chunk of splitLongTextIntoChunks(rv.text, 280)) {
              parsedSlides.push({
                id: crypto.randomUUID(),
                text: chunk,
                reference: `${bookName} ${chapterNum}:${rv.num} (${finalVersion.toUpperCase()})`,
                isVerse: true,
              });
            }
          }
        }
      } else {
        // Single verse
        let fetchedText = '';
        if (useDb && !slideText && bible && matchedBook) {
          const actualChapters = matchedBook.chapters.filter(
            (ch) => ch.is_chapter,
          );
          const chapter = actualChapters[chapterNum - 1];
          if (chapter) {
            const vItem = chapter.items.find(
              (item) =>
                item.type === 'verse' &&
                item.verse_numbers.includes(verseStart),
            );
            if (vItem) fetchedText = `${verseStart} ${vItem.lines.join(' ')}`;
          }
        }

        let targetText = slideText || fetchedText || trimmed;
        const singlePrefix = `${verseStart}`;
        const singleTrimmed = targetText.trim();
        const startsWithSingleNum = new RegExp(
          `^${singlePrefix}(?:[\\s.,;()\\u00a0\\[\\]"']|$)`,
        );
        targetText = startsWithSingleNum.test(singleTrimmed)
          ? singleTrimmed
          : `${singlePrefix} ${singleTrimmed}`;

        for (const chunk of splitLongTextIntoChunks(targetText, 280)) {
          parsedSlides.push({
            id: crypto.randomUUID(),
            text: chunk,
            reference: `${bookName} ${chapterNum}:${verseStart} (${finalVersion.toUpperCase()})`,
            isVerse: true,
          });
        }
      }
    } else {
      // Plain text segment
      for (const chunk of splitLongTextIntoChunks(trimmed, 280)) {
        parsedSlides.push({
          id: crypto.randomUUID(),
          text: chunk,
          reference: '',
          isVerse: false,
        });
      }
    }
  }

  return parsedSlides;
};
