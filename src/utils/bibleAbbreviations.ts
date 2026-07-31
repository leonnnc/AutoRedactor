/**
 * Normalise: lowercase + strip diacritics + collapse spaces
 */
export const norm = (s: string) =>
  s.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Short canonical names used in the alias table.
 * The alias table maps every abbreviation → one of these short names.
 * resolveBookName then fuzzy-matches these against the real file names
 * (which may be prefixed with "S." or "San").
 */
const ALIASES: Record<string, string> = {
  // ── Génesis ──
  'genesis': 'Genesis', 'gen': 'Genesis', 'gn': 'Genesis',
  // ── Éxodo ──
  'exodo': 'Exodo', 'exo': 'Exodo', 'ex': 'Exodo',
  // ── Levítico ──
  'levitico': 'Levitico', 'lev': 'Levitico', 'lv': 'Levitico',
  // ── Números ──
  'numeros': 'Numeros', 'num': 'Numeros', 'nm': 'Numeros', 'nu': 'Numeros',
  // ── Deuteronomio ──
  'deuteronomio': 'Deuteronomio', 'deut': 'Deuteronomio', 'dt': 'Deuteronomio',
  // ── Josué ──
  'josue': 'Josue', 'jos': 'Josue',
  // ── Jueces ──
  'jueces': 'Jueces', 'jue': 'Jueces',
  // ── Rut ──
  'rut': 'Rut', 'rt': 'Rut',
  // ── 1 Samuel ──
  '1 samuel': '1 Samuel', '1sam': '1 Samuel', '1sa': '1 Samuel', '1s': '1 Samuel',
  // ── 2 Samuel ──
  '2 samuel': '2 Samuel', '2sam': '2 Samuel', '2sa': '2 Samuel', '2s': '2 Samuel',
  // ── 1 Reyes ──
  '1 reyes': '1 Reyes', '1re': '1 Reyes', '1r': '1 Reyes', '1rey': '1 Reyes',
  // ── 2 Reyes ──
  '2 reyes': '2 Reyes', '2re': '2 Reyes', '2r': '2 Reyes', '2rey': '2 Reyes',
  // ── 1 Crónicas ──
  '1 cronicas': '1 Cronicas', '1cr': '1 Cronicas', '1cro': '1 Cronicas',
  // ── 2 Crónicas ──
  '2 cronicas': '2 Cronicas', '2cr': '2 Cronicas', '2cro': '2 Cronicas',
  // ── Esdras ──
  'esdras': 'Esdras', 'esd': 'Esdras',
  // ── Nehemías ──
  'nehemias': 'Nehemias', 'neh': 'Nehemias',
  // ── Ester ──
  'ester': 'Ester', 'est': 'Ester',
  // ── Job ──
  'job': 'Job',
  // ── Salmos ──
  'salmos': 'Salmos', 'sal': 'Salmos', 'ps': 'Salmos', 'sl': 'Salmos', 'salmo': 'Salmos',
  // ── Proverbios ──
  'proverbios': 'Proverbios', 'prov': 'Proverbios', 'pr': 'Proverbios',
  // ── Eclesiastés ──
  'eclesiastes': 'Eclesiastes', 'ecl': 'Eclesiastes', 'ec': 'Eclesiastes',
  // ── Cantares ──
  'cantares': 'Cantares', 'cant': 'Cantares', 'ct': 'Cantares', 'cantar': 'Cantares',
  // ── Isaías ──
  'isaias': 'Isaias', 'is': 'Isaias', 'isa': 'Isaias',
  // ── Jeremías ──
  'jeremias': 'Jeremias', 'jer': 'Jeremias', 'jr': 'Jeremias',
  // ── Lamentaciones ──
  'lamentaciones': 'Lamentaciones', 'lam': 'Lamentaciones',
  // ── Ezequiel ──
  'ezequiel': 'Ezequiel', 'ez': 'Ezequiel', 'eze': 'Ezequiel',
  // ── Daniel ──
  'daniel': 'Daniel', 'dn': 'Daniel', 'dan': 'Daniel',
  // ── Oseas ──
  'oseas': 'Oseas', 'os': 'Oseas',
  // ── Joel ──
  'joel': 'Joel', 'jl': 'Joel',
  // ── Amós ──
  'amos': 'Amos', 'am': 'Amos',
  // ── Abdías ──
  'abdias': 'Abdias', 'abd': 'Abdias',
  // ── Jonás ──
  'jonas': 'Jonas', 'jon': 'Jonas',
  // ── Miqueas ──
  'miqueas': 'Miqueas', 'miq': 'Miqueas', 'mi': 'Miqueas',
  // ── Nahúm ──
  'nahum': 'Nahum', 'nah': 'Nahum', 'na': 'Nahum',
  // ── Habacuc ──
  'habacuc': 'Habacuc', 'hab': 'Habacuc',
  // ── Sofonías ──
  'sofonias': 'Sofonias', 'sof': 'Sofonias',
  // ── Hageo ──
  'hageo': 'Hageo', 'hag': 'Hageo',
  // ── Zacarías ──
  'zacarias': 'Zacarias', 'zac': 'Zacarias', 'zc': 'Zacarias',
  // ── Malaquías ──
  'malaquias': 'Malaquias', 'mal': 'Malaquias',

  // ── Mateo ──
  'mateo': 'Mateo', 'mat': 'Mateo', 'mt': 'Mateo',
  // ── Marcos ──
  'marcos': 'Marcos', 'mar': 'Marcos', 'mc': 'Marcos', 'mr': 'Marcos',
  // ── Lucas ──
  'lucas': 'Lucas', 'luc': 'Lucas', 'lc': 'Lucas',
  // ── Juan ──
  'juan': 'Juan', 'jn': 'Juan', 'jua': 'Juan',
  // ── Hechos ──
  'hechos': 'Hechos', 'hch': 'Hechos', 'hec': 'Hechos', 'act': 'Hechos',
  'hechos de los apostoles': 'Hechos',
  // ── Romanos ──
  'romanos': 'Romanos', 'rom': 'Romanos', 'ro': 'Romanos', 'rm': 'Romanos',
  // ── 1 Corintios ──
  '1 corintios': '1 Corintios', '1cor': '1 Corintios', '1co': '1 Corintios',
  // ── 2 Corintios ──
  '2 corintios': '2 Corintios', '2cor': '2 Corintios', '2co': '2 Corintios',
  // ── Gálatas ──
  'galatas': 'Galatas', 'gal': 'Galatas', 'ga': 'Galatas',
  // ── Efesios ──
  'efesios': 'Efesios', 'ef': 'Efesios', 'efe': 'Efesios',
  // ── Filipenses ──
  'filipenses': 'Filipenses', 'fil': 'Filipenses', 'flp': 'Filipenses', 'fp': 'Filipenses',
  // ── Colosenses ──
  'colosenses': 'Colosenses', 'col': 'Colosenses',
  // ── 1 Tesalonicenses ──
  '1 tesalonicenses': '1 Tesalonicenses', '1tes': '1 Tesalonicenses', '1ts': '1 Tesalonicenses',
  // ── 2 Tesalonicenses ──
  '2 tesalonicenses': '2 Tesalonicenses', '2tes': '2 Tesalonicenses', '2ts': '2 Tesalonicenses',
  // ── 1 Timoteo ──
  '1 timoteo': '1 Timoteo', '1tim': '1 Timoteo', '1ti': '1 Timoteo',
  // ── 2 Timoteo ──
  '2 timoteo': '2 Timoteo', '2tim': '2 Timoteo', '2ti': '2 Timoteo',
  // ── Tito ──
  'tito': 'Tito', 'tit': 'Tito', 'tt': 'Tito',
  // ── Filemón ──
  'filemon': 'Filemon', 'flm': 'Filemon', 'fim': 'Filemon',
  // ── Hebreos ──
  'hebreos': 'Hebreos', 'heb': 'Hebreos',
  // ── Santiago ──
  'santiago': 'Santiago', 'stg': 'Santiago', 'san': 'Santiago', 'snt': 'Santiago',
  // ── 1 Pedro ──
  '1 pedro': '1 Pedro', '1pe': '1 Pedro', '1p': '1 Pedro', '1ped': '1 Pedro',
  // ── 2 Pedro ──
  '2 pedro': '2 Pedro', '2pe': '2 Pedro', '2p': '2 Pedro', '2ped': '2 Pedro',
  // ── 1 Juan ──
  '1 juan': '1 Juan', '1jn': '1 Juan', '1j': '1 Juan',
  // ── 2 Juan ──
  '2 juan': '2 Juan', '2jn': '2 Juan', '2j': '2 Juan',
  // ── 3 Juan ──
  '3 juan': '3 Juan', '3jn': '3 Juan', '3j': '3 Juan',
  // ── Judas ──
  'judas': 'Judas', 'jud': 'Judas',
  // ── Apocalipsis ──
  'apocalipsis': 'Apocalipsis', 'apoc': 'Apocalipsis', 'ap': 'Apocalipsis', 'rev': 'Apocalipsis',
};

/**
 * Strip the "S." / "San " / "Santo " prefix that RVR1960 and DHH use
 * for gospel books, so we can match "S. Juan" → "Juan".
 */
const stripHonorific = (s: string) =>
  s.replace(/^(s\.\s*|san\s+|santo\s+)/i, '').trim();

/**
 * Given a user-typed book name and the actual list of book names from the
 * loaded JSON, return the exact name as it appears in the file.
 */
export const resolveBookName = (
  input: string,
  booksInFile: string[],
): string | null => {
  const nInput = norm(input);

  // ── 1. Direct normalised match against file names (handles accents) ───────
  const direct = booksInFile.find((b) => norm(b) === nInput);
  if (direct) return direct;

  // ── 2. Strip honorific from file names and try again ─────────────────────
  // e.g. "S. Juan" → "Juan", "San Mateo" → "Mateo"
  const stripped = booksInFile.find(
    (b) => norm(stripHonorific(b)) === nInput,
  );
  if (stripped) return stripped;

  // ── 3. Alias table → short canonical → fuzzy match in file ───────────────
  const shortName = ALIASES[nInput];
  if (shortName) {
    const nShort = norm(shortName);

    // exact match after normalising file name
    const exact = booksInFile.find((b) => norm(b) === nShort);
    if (exact) return exact;

    // match after stripping honorific
    const honorific = booksInFile.find(
      (b) => norm(stripHonorific(b)) === nShort,
    );
    if (honorific) return honorific;

    // contains match (e.g. "Hechos de los Apóstoles" contains "Hechos")
    const contains = booksInFile.find((b) =>
      norm(b).includes(nShort) || nShort.includes(norm(stripHonorific(b))),
    );
    if (contains) return contains;
  }

  // ── 4. Prefix match against alias keys (e.g. "ju" → "Juan") ─────────────
  const prefixKey = Object.keys(ALIASES).find(
    (k) => k.startsWith(nInput) && nInput.length >= 2,
  );
  if (prefixKey) {
    return resolveBookName(ALIASES[prefixKey], booksInFile);
  }

  // ── 5. Prefix match directly against stripped file names ─────────────────
  const prefixBook = booksInFile.find(
    (b) => norm(stripHonorific(b)).startsWith(nInput) && nInput.length >= 3,
  );
  if (prefixBook) return prefixBook;

  return null;
};

/**
 * Parse a free-form bible reference into its components.
 *
 * Accepted examples:
 *   juan 3:16    jn 3:16    Juan 3:16    juan 3 16    jn 3 16
 *   jn3:16       jn3 16     juan3:16
 *   jn 3:16-18   juan 3 16 18   1co 13:4   Sal 23:1-3
 *   1 juan 3:16  1jn 3:16   1 jn 3 16
 */
export interface ParsedRef {
  bookRaw: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

export const parseBibleRef = (input: string): ParsedRef | null => {
  const s = input.trim();

  // Pattern: (optional 1-3 + optional space + letters) + separator + digits
  // We allow colon or whitespace as separator between chapter and verse.
  const re =
    /^((?:[1-3]\s*)?\D+?)\s*(\d+)[:\s]+(\d+)(?:[:\s\-–]+(\d+))?$/i;

  const m = s.match(re);
  if (!m) return null;

  const bookRaw = m[1].trim();
  const chapter = parseInt(m[2]);
  const verseStart = parseInt(m[3]);
  const verseEnd = m[4] ? parseInt(m[4]) : verseStart;

  if (!bookRaw || isNaN(chapter) || isNaN(verseStart)) return null;

  return { bookRaw, chapter, verseStart, verseEnd };
};
