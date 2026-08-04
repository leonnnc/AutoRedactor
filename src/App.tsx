import { useState, useEffect, useRef } from 'react';
import { SermonInputPanel } from './components/SermonInputPanel';
import { CanvasEditor } from './components/CanvasEditor';
import { EditorPanel } from './components/EditorPanel';
import type {
  Slide, CanvasElement, SlideBackground,
  ViewportMode, BibleData, BibleVersion, CustomCanvasSize,
} from './types';
import {
  Monitor, Tablet, Smartphone, ChevronLeft, ChevronRight,
  AlertTriangle, Plus, Trash2, ChevronUp, ChevronDown, Maximize2,
} from 'lucide-react';
import {
  parseSermonIntoSlides, makeDefaultSlide, makeTextElement, DEFAULT_BACKGROUND,
} from './utils/parseSermon';
import { exportCurrentJpg, exportAllJpg, exportPdf, exportPptx } from './utils/exporters';

// ─── Operator dialog types ────────────────────────────────────────────────────
interface OperatorOption { label: string; action: () => void; variant?: 'primary' | 'secondary' | 'danger'; }
interface OperatorError  { title: string; message: string; options: OperatorOption[]; }

export default function App() {
  const [sermonText, setSermonText]     = useState('');
  const [slides, setSlides]             = useState<Slide[]>(() => [makeDefaultSlide()]);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(() => slides[0]?.id ?? null);
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');
  const [customCanvas, setCustomCanvas] = useState<CustomCanvasSize>({ width: 1920, height: 1080 });
  const [operatorError, setOperatorError] = useState<OperatorError | null>(null);

  const [bibleVersion, setBibleVersion] = useState<BibleVersion>('rvr1960');
  const [bibleData, setBibleData]       = useState<BibleData | null>(null);
  const [bibleLoading, setBibleLoading] = useState(false);
  const bibleCache = useRef<Record<string, BibleData>>({});

  const [isExporting, setIsExporting]     = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  // ── derived ──────────────────────────────────────────────────────────────
  const activeSlideIndex = slides.findIndex((s) => s.id === activeSlideId);
  const activeSlide = activeSlideIndex !== -1 ? slides[activeSlideIndex] : null;
  const selectedElement = activeSlide?.elements.find((e) => e.id === selectedElId) ?? null;

  // ── operator dialog ───────────────────────────────────────────────────────
  const askOperator = (title: string, message: string,
    options: { label: string; value: string; variant?: 'primary' | 'secondary' | 'danger' }[],
  ): Promise<string> =>
    new Promise((resolve) => {
      setOperatorError({ title, message,
        options: options.map((opt) => ({ label: opt.label, variant: opt.variant,
          action: () => { setOperatorError(null); resolve(opt.value); } })),
      });
    });

  const confirmDialog = (msg: string) =>
    askOperator('Confirmar', msg, [
      { label: 'Cancelar', value: 'cancel', variant: 'secondary' },
      { label: 'Aceptar',  value: 'ok',     variant: 'primary'   },
    ]).then((v) => v === 'ok');

  const alertDialog = (msg: string) =>
    askOperator('Aviso', msg, [{ label: 'Entendido', value: 'ok', variant: 'primary' }])
      .then(() => undefined);

  // ── Bible loading ─────────────────────────────────────────────────────────
  const fetchBibleVersion = async (version: string): Promise<BibleData | null> => {
    const key = version.toLowerCase();
    if (bibleCache.current[key]) return bibleCache.current[key];
    try {
      const res = await fetch(`/bibles/${key}.json`);
      if (res.ok) { const d: BibleData = await res.json(); bibleCache.current[key] = d; return d; }
    } catch (e) { console.error(e); }
    return null;
  };

  useEffect(() => {
    const load = async () => {
      if (bibleCache.current[bibleVersion]) { setBibleData(bibleCache.current[bibleVersion]); return; }
      setBibleLoading(true);
      try {
        const res = await fetch(`/bibles/${bibleVersion}.json`);
        if (!res.ok) throw new Error();
        const d: BibleData = await res.json();
        bibleCache.current[bibleVersion] = d;
        setBibleData(d);
      } catch { console.error('Error loading Bible'); } finally { setBibleLoading(false); }
    };
    load();
  }, [bibleVersion]);

  // ── Slide navigation ───────────────────────────────────────────────────────
  const handlePrevSlide = () => { if (activeSlideIndex > 0) { setActiveSlideId(slides[activeSlideIndex-1].id); setSelectedElId(null); }};
  const handleNextSlide = () => { if (activeSlideIndex < slides.length-1) { setActiveSlideId(slides[activeSlideIndex+1].id); setSelectedElId(null); }};
  const handleSelectSlide = (id: string) => { setActiveSlideId(id); setSelectedElId(null); };

  // ── Slide CRUD ─────────────────────────────────────────────────────────────
  const handleAddSlide = () => {
    const s = makeDefaultSlide();
    setSlides((p) => [...p, s]);
    setActiveSlideId(s.id);
    setSelectedElId(null);
  };

  const handleDeleteSlide = async (id: string) => {
    if (slides.length <= 1) { await alertDialog('Necesitas al menos una diapositiva.'); return; }
    const filtered = slides.filter((s) => s.id !== id);
    setSlides(filtered);
    if (activeSlideId === id) { setActiveSlideId(filtered[0].id); setSelectedElId(null); }
  };

  const handleReorderSlides = (i1: number, i2: number) => {
    if (i1 < 0 || i1 >= slides.length || i2 < 0 || i2 >= slides.length) return;
    const ns = [...slides];
    [ns[i1], ns[i2]] = [ns[i2], ns[i1]];
    setSlides(ns);
  };

  // ── Element CRUD ───────────────────────────────────────────────────────────
  const handleAddTextElement = () => {
    if (!activeSlideId) return;
    const el = makeTextElement('Nuevo texto', { y: 40, h: 20, fontSize: 48 });
    setSlides((p) => p.map((s) => s.id === activeSlideId ? { ...s, elements: [...s.elements, el] } : s));
    setSelectedElId(el.id);
  };

  const handleUpdateElement = (elId: string, fields: Partial<CanvasElement>) => {
    if (!activeSlideId) return;
    setSlides((p) => p.map((s) => s.id !== activeSlideId ? s : {
      ...s, elements: s.elements.map((e) => e.id === elId ? { ...e, ...fields } : e),
    }));
  };

  const handleDeleteElement = (elId: string) => {
    if (!activeSlideId) return;
    setSlides((p) => p.map((s) => s.id !== activeSlideId ? s : {
      ...s, elements: s.elements.filter((e) => e.id !== elId),
    }));
    setSelectedElId(null);
  };

  // ── Background ─────────────────────────────────────────────────────────────
  const handleUpdateBackground = (fields: Partial<SlideBackground>) => {
    if (!activeSlideId) return;
    setSlides((p) => p.map((s) => s.id !== activeSlideId ? s : {
      ...s, background: { ...s.background, ...fields },
    }));
  };

  const handleApplyBgToAll = async () => {
    if (!activeSlide) return;
    const ok = await confirmDialog('¿Aplicar este fondo a todas las diapositivas?');
    if (!ok) return;
    const bg = { ...activeSlide.background };
    setSlides((p) => p.map((s) => ({ ...s, background: { ...bg } })));
  };

  // ── Verse adding (from Bible panel) ────────────────────────────────────────
  const handleAddVerseToSlides = (text: string, reference: string) => {
    const bg = activeSlide?.background ?? { ...DEFAULT_BACKGROUND };
    const s: Slide = {
      id: crypto.randomUUID(),
      isVerse: true,
      background: { ...bg },
      elements: [
        makeTextElement(text, { x: 5, y: 20, w: 90, h: 52 }),
        {
          id: crypto.randomUUID(), type: 'text',
          x: 5, y: 76, w: 90, h: 12,
          text: reference, isReference: true,
          fontSize: 64, fontFamily: "'Playfair Display', serif",
          color: '#fde047', bold: true, italic: true, uppercase: true,
          textAlign: 'center', lineHeight: 1.2, textShadow: true, opacity: 0.9, rotation: 0,
        },
      ],
    };
    setSlides((p) => [...p, s]);
    setActiveSlideId(s.id);
    setSelectedElId(null);
  };

  // ── Clear all ──────────────────────────────────────────────────────────────
  const handleClearAll = async () => {
    const ok = await confirmDialog('¿Borrar el texto y todas las diapositivas?');
    if (!ok) return;
    setSermonText('');
    const fresh = makeDefaultSlide();
    setSlides([fresh]);
    setActiveSlideId(fresh.id);
    setSelectedElId(null);
  };

  // ── Generate from sermon ───────────────────────────────────────────────────
  const handleGenerateSlides = async () => {
    if (!sermonText.trim()) return;
    setExportProgress('Procesando bosquejo...');
    setIsExporting(true);
    try {
      const bg = activeSlide?.background ?? { ...DEFAULT_BACKGROUND };
      const parsed = await parseSermonIntoSlides(sermonText, bibleVersion, fetchBibleVersion, askOperator, bg);
      if (parsed.length > 0) { setSlides(parsed); setActiveSlideId(parsed[0].id); setSelectedElId(null); }
      else await alertDialog('No se pudo extraer ninguna diapositiva.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('cancelada')) await alertDialog('Error al generar las diapositivas.');
    } finally { setIsExporting(false); setExportProgress(''); }
  };

  // ── Exports ────────────────────────────────────────────────────────────────
  const withExport = async (fn: () => Promise<void>) => {
    setIsExporting(true);
    try { await fn(); }
    catch (e) { console.error(e); await alertDialog('Error al exportar. Intenta de nuevo.'); }
    finally { setIsExporting(false); setExportProgress(''); }
  };

  const handleExportCurrentJpg = () => withExport(() => exportCurrentJpg(activeSlide!, activeSlideIndex, null, viewportMode, setExportProgress, customCanvas));
  const handleExportAllJpg     = () => withExport(() => exportAllJpg(slides, null, viewportMode, setExportProgress, customCanvas));
  const handleExportPdf        = () => withExport(() => exportPdf(slides, null, viewportMode, setExportProgress, customCanvas));
  const handleExportPptx       = () => withExport(() => exportPptx(slides, null, viewportMode, setExportProgress, customCanvas));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      <SermonInputPanel
        sermonText={sermonText} onChangeSermonText={setSermonText}
        onGenerateSlides={handleGenerateSlides} onClearAll={handleClearAll}
        bibleVersion={bibleVersion} onChangeBibleVersion={setBibleVersion}
        bibleData={bibleData} bibleLoading={bibleLoading}
        onAddVerseToSlides={handleAddVerseToSlides}
      />

      <div className="workspace">
        {/* Control bar */}
        <div className="control-bar">
          <div className="viewport-selectors">
            {([['desktop','Desktop 16:9', Monitor], ['tablet','Tableta 4:3', Tablet], ['mobile','Móvil 9:16', Smartphone], ['custom','Custom', Maximize2]] as const).map(([mode, label, Icon]) => (
              <button key={mode} className={`viewport-btn ${viewportMode === mode ? 'active' : ''}`}
                onClick={() => setViewportMode(mode)}>
                <Icon size={14}/>{label}
              </button>
            ))}
          </div>

          {viewportMode === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {(['width','height'] as const).map((dim) => (
                <input key={dim} type="number" min={100} max={7680} value={customCanvas[dim]}
                  onChange={(e) => setCustomCanvas((p) => ({ ...p, [dim]: Math.max(100, parseInt(e.target.value) || 1920) }))}
                  style={{ width: '72px', padding: '4px 8px', fontSize: '12px', fontWeight: '600', background: 'var(--bg-deep)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-main)', textAlign: 'center' }} />
              ))}
              <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>px</span>
            </div>
          )}

          <div className="slide-number-nav">
            <button className="slide-nav-btn" onClick={handlePrevSlide} disabled={activeSlideIndex <= 0}><ChevronLeft size={16}/></button>
            <span className="slide-nav-indicator">{activeSlideIndex + 1} / {slides.length}</span>
            <button className="slide-nav-btn" onClick={handleNextSlide} disabled={activeSlideIndex >= slides.length-1}><ChevronRight size={16}/></button>
          </div>
        </div>

        {/* Canvas editor */}
        <CanvasEditor
          slide={activeSlide ?? makeDefaultSlide()}
          selectedId={selectedElId}
          viewportMode={viewportMode}
          customCanvas={customCanvas}
          onSelectElement={setSelectedElId}
          onUpdateElement={handleUpdateElement}
          onAddTextElement={handleAddTextElement}
        />

        {/* Filmstrip */}
        <div className="filmstrip">
          <div className="filmstrip-scroll">
            <button className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', flexShrink: 0, height: '56px', whiteSpace: 'nowrap' }}
              onClick={handleAddSlide}>
              <Plus size={14}/>Nueva
            </button>
            {slides.map((slide, idx) => (
              <div key={slide.id}
                className={`slide-thumb-card ${activeSlideId === slide.id ? 'active' : ''}`}
                onClick={() => handleSelectSlide(slide.id)}
                style={{ flexDirection: 'row', alignItems: 'center', width: '160px', height: '56px', padding: '8px 10px', flexShrink: 0 }}>
                <div className="slide-thumb-index">{idx + 1}</div>
                <div className="slide-thumb-info">
                  <span className="slide-thumb-text">{slide.elements[0]?.text || '(Vacía)'}</span>
                  {slide.isVerse && slide.elements[1] && (
                    <span className="slide-thumb-ref">{slide.elements[1].text}</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button className="slide-thumb-delete" disabled={idx === 0} onClick={(e) => { e.stopPropagation(); handleReorderSlides(idx, idx-1); }}><ChevronUp size={11}/></button>
                    <button className="slide-thumb-delete" disabled={idx === slides.length-1} onClick={(e) => { e.stopPropagation(); handleReorderSlides(idx, idx+1); }}><ChevronDown size={11}/></button>
                  </div>
                  <button className="slide-thumb-delete" onClick={(e) => { e.stopPropagation(); handleDeleteSlide(slide.id); }}><Trash2 size={11}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <EditorPanel
        activeSlide={activeSlide} selectedElement={selectedElement}
        onUpdateElement={handleUpdateElement} onDeleteElement={handleDeleteElement}
        onUpdateBackground={handleUpdateBackground} onApplyBgToAll={handleApplyBgToAll}
        onExportCurrentJpg={handleExportCurrentJpg} onExportAllJpg={handleExportAllJpg}
        onExportPdf={handleExportPdf} onExportPptx={handleExportPptx}
        isExporting={isExporting} exportProgress={exportProgress}
      />

      {operatorError && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header"><AlertTriangle size={24} color="#f59e0b" style={{ flexShrink: 0 }}/><h3>{operatorError.title}</h3></div>
            <div className="modal-body"><p style={{ margin: 0, whiteSpace: 'pre-line' }}>{operatorError.message}</p></div>
            <div className="modal-actions">
              {operatorError.options.map((opt, i) => (
                <button key={i} className={`modal-btn ${opt.variant ?? 'secondary'}`} onClick={opt.action}>{opt.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
