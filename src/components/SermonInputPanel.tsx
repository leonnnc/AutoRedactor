import React, { useState, useEffect, useRef } from 'react';
import type { BibleData, BibleVersion } from '../types';
import { BookOpen, FileText, Search, Sparkles, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { parseBibleRef, resolveBookName, norm } from '../utils/bibleAbbreviations';

interface SermonInputPanelProps {
  sermonText: string;
  onChangeSermonText: (text: string) => void;
  onGenerateSlides: () => void;
  onClearAll: () => void;
  bibleVersion: BibleVersion;
  onChangeBibleVersion: (version: BibleVersion) => void;
  bibleData: BibleData | null;
  bibleLoading: boolean;
  onAddVerseToSlides: (text: string, reference: string) => void;
}

interface VerseResult {
  reference: string;
  text: string;
  added: boolean;
}

export const SermonInputPanel: React.FC<SermonInputPanelProps> = ({
  sermonText,
  onChangeSermonText,
  onGenerateSlides,
  onClearAll,
  bibleVersion,
  onChangeBibleVersion,
  bibleData,
  bibleLoading,
  onAddVerseToSlides,
}) => {
  const [activeTab, setActiveTab] = useState<'sermon' | 'bible'>('sermon');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VerseResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset when bible version changes
  useEffect(() => {
    setResults([]);
    setSearchError('');
    setQuery('');
  }, [bibleVersion, bibleData]);

  const lookupVerses = (q: string): VerseResult[] | string => {
    if (!bibleData) return 'La Biblia aún no está cargada.';

    const parsed = parseBibleRef(q);
    if (!parsed) return 'Formato no reconocido. Intenta: "Juan 3:16", "jn 3 16", "Sal 23:1-3"';

    const bookNames = bibleData.books.map((b) => b.name);
    const canonicalName = resolveBookName(parsed.bookRaw, bookNames);
    if (!canonicalName) return `No encontré el libro "${parsed.bookRaw}". Verifica la abreviatura.`;

    const book = bibleData.books.find((b) => norm(b.name) === norm(canonicalName));
    if (!book) return `Libro "${canonicalName}" no encontrado en esta versión.`;

    const actualChapters = book.chapters.filter((c) => c.is_chapter);
    const chapter = actualChapters[parsed.chapter - 1];
    if (!chapter) return `${canonicalName} solo tiene ${actualChapters.length} capítulos.`;

    const found: VerseResult[] = [];
    for (let v = parsed.verseStart; v <= parsed.verseEnd; v++) {
      const item = chapter.items.find(
        (i) => i.type === 'verse' && i.verse_numbers.includes(v),
      );
      if (!item) return `El capítulo ${parsed.chapter} de ${canonicalName} no tiene versículo ${v}.`;

      const text = `${v} ${item.lines.join(' ')}`;
      const ref = `${canonicalName} ${parsed.chapter}:${v} (${bibleVersion.toUpperCase()})`;
      found.push({ reference: ref, text, added: false });
    }
    return found;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchError('');

    const res = lookupVerses(query.trim());
    if (typeof res === 'string') {
      setSearchError(res);
      return;
    }
    // Accumulate — each new search appends to the list
    setResults((prev) => [...prev, ...res]);
    setQuery('');
    inputRef.current?.focus();
  };

  const handleAdd = (idx: number) => {
    const item = results[idx];
    if (!item || item.added) return;
    onAddVerseToSlides(item.text, item.reference);
    setResults((prev) => prev.map((r, i) => (i === idx ? { ...r, added: true } : r)));
  };

  const handleAddAll = () => {
    // Collect pending items first, then batch-add and mark all as added
    const pending = results.filter((r) => !r.added);
    pending.forEach((item) => onAddVerseToSlides(item.text, item.reference));
    setResults((prev) => prev.map((r) => ({ ...r, added: true })));
  };

  return (
    <div className="panel">
      {/* App Header */}
      <div className="panel-header" style={{ justifyContent: 'space-between' }}>
        <h1 className="panel-title" style={{ fontSize: '18px', margin: 0 }}>
          <Sparkles size={20} style={{ color: 'var(--accent-secondary)' }} />
          AutoRedactor
        </h1>
        <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: '12px', color: 'var(--text-muted)' }}>
          v3.4.5
        </span>
      </div>

      <div className="panel-content" style={{ paddingBottom: '10px' }}>
        {/* Tabs */}
        <div className="tabs-header">
          <button className={`tab-btn ${activeTab === 'sermon' ? 'active' : ''}`} onClick={() => setActiveTab('sermon')}>
            <FileText size={14} />
            Prédica
          </button>
          <button className={`tab-btn ${activeTab === 'bible' ? 'active' : ''}`} onClick={() => setActiveTab('bible')}>
            <BookOpen size={14} />
            Biblia
          </button>
        </div>

        {/* ── Tab Prédica ── */}
        {activeTab === 'sermon' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group">
              <span className="form-label">Texto de la Prédica</span>
              <textarea
                className="form-textarea"
                placeholder="Escribe o pega tu bosquejo o prédica aquí. Separa las diapositivas con una línea en blanco doble o escribe '---' para un salto manual. Ej: Mateo 6:33 se autodetectará."
                value={sermonText}
                onChange={(e) => onChangeSermonText(e.target.value)}
                style={{ minHeight: '400px', flex: 1 }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={onGenerateSlides} disabled={sermonText.trim() === ''}>
                Crear Presentación
              </button>
              <button className="btn btn-secondary btn-danger" onClick={onClearAll} title="Borra el texto y todas las diapositivas">
                Borrar Todo
              </button>
            </div>
          </div>
        )}

        {/* ── Tab Biblia ── */}
        {activeTab === 'bible' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Version selector */}
            <div className="form-group">
              <span className="form-label">Versión de la Biblia</span>
              <select className="form-select" value={bibleVersion} onChange={(e) => onChangeBibleVersion(e.target.value as BibleVersion)}>
                <option value="rvr1960">Reina Valera 1960 (RVR1960)</option>
                <option value="nvi">Nueva Versión Internacional (NVI)</option>
                <option value="tla">Traducción en Lenguaje Actual (TLA)</option>
                <option value="ntv">Nueva Traducción Viviente (NTV)</option>
                <option value="lbla">La Biblia de las Américas (LBLA)</option>
                <option value="dhh">Dios Habla Hoy (DHH)</option>
                <option value="nbla">Nueva Biblia de las Américas (NBLA)</option>
              </select>
            </div>

            {bibleLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px 0', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cargando Biblia...</span>
              </div>
            ) : (
              <>
                {/* Smart search */}
                <form className="form-group" onSubmit={handleSearch}>
                  <span className="form-label">Buscar versículo</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      ref={inputRef}
                      type="text"
                      className="form-input"
                      placeholder="jn 3:16 · juan 3 16 · Sal 23:1-3 · 1co 13:4"
                      value={query}
                      onChange={(e) => { setQuery(e.target.value); setSearchError(''); }}
                      style={{ flex: 1 }}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button type="submit" className="btn btn-secondary" disabled={!query.trim()} style={{ padding: '8px 12px' }}>
                      <Search size={15} />
                    </button>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-disabled)', lineHeight: '1.5' }}>
                    Acepta: jn 3:16 · juan 3:16 · Juan 3:16 · juan 3 16 · jn 3 16 · jn 3:16-18
                  </span>

                  {searchError && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', marginTop: '4px' }}>
                      <AlertCircle size={14} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '1px' }} />
                      <span style={{ fontSize: '12px', color: 'var(--danger)' }}>{searchError}</span>
                    </div>
                  )}
                </form>

                {/* Results — accumulate */}
                {results.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="form-label" style={{ margin: 0 }}>
                        {results.filter((r) => !r.added).length} pendiente(s) · {results.filter((r) => r.added).length} añadido(s)
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {results.some((r) => !r.added) && (
                          <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={handleAddAll}>
                            <Plus size={12} /> Añadir todos
                          </button>
                        )}
                        <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => { setResults([]); setSearchError(''); }}>
                          Limpiar
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '380px', overflowY: 'auto' }}>
                      {results.map((res, idx) => (
                        <div
                          key={idx}
                          className="bible-result-item"
                          style={{ padding: '10px 12px', opacity: res.added ? 0.45 : 1, transition: 'opacity 0.2s' }}
                        >
                          <div className="bible-result-header">
                            <span className="bible-result-ref" style={{ fontSize: '11px' }}>{res.reference}</span>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleAdd(idx)}
                              disabled={res.added}
                            >
                              {res.added
                                ? <><CheckCircle size={10} /> Añadido</>
                                : <><Plus size={10} /> Añadir</>}
                            </button>
                          </div>
                          <p className="bible-result-text" style={{ fontSize: '12px', lineHeight: '1.5', margin: '4px 0 0' }}>
                            {res.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
