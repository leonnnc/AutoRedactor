import { useState, useEffect, useRef } from 'react';
import { SermonInputPanel } from './components/SermonInputPanel';
import { SlidePreview } from './components/SlidePreview';
import { EditorPanel } from './components/EditorPanel';
import type { Slide, SlideStyle, ViewportMode, BibleData, BibleVersion, CustomCanvasSize, TextBlock } from './types';
import { Monitor, Tablet, Smartphone, ChevronLeft, ChevronRight, AlertTriangle, Plus, Trash2, ChevronUp, ChevronDown, Maximize2 } from 'lucide-react';
import { parseSermonIntoSlides } from './utils/parseSermon';
import {
  exportCurrentJpg,
  exportAllJpg,
  exportPdf,
  exportPptx,
} from './utils/exporters';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_GLOBAL_STYLE: SlideStyle = {
  fontSize: 64,
  lineHeight: 1.4,
  color: '#ffffff',
  fontFamily: "'Playfair Display', serif",
  textAlign: 'center',
  verticalAlign: 'center',
  horizontalAlign: 'center',
  bold: false,
  italic: false,
  uppercase: false,
  textShadow: true,
  textShadowColor: 'rgba(0, 0, 0, 0.75)',
  textShadowBlur: 6,
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
  paddingX: 15,
  paddingY: 8,
  refColor: '#fde047',
  refFontSize: 32,
  refItalic: true,
  refPosition: 'bottom',
};

const makeDefaultBlock = (): TextBlock => ({
  id: crypto.randomUUID(),
  text: '',
  fontSize: 48,
  color: '#ffffff',
  fontFamily: "'Playfair Display', serif",
  bold: false,
  italic: false,
  uppercase: false,
  textAlign: 'center',
  textShadow: true,
});

const makeDefaultSlide = (): Slide => ({
  id: crypto.randomUUID(),
  text: 'Nueva Diapositiva',
  reference: '',
  isVerse: false,
  extraBlocks: [],
});

// ─── Operator dialog types ────────────────────────────────────────────────────

interface OperatorOption {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface OperatorError {
  title: string;
  message: string;
  options: OperatorOption[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function App() {
  const [sermonText, setSermonText] = useState<string>('');
  const [slides, setSlides] = useState<Slide[]>(() => [makeDefaultSlide()]);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(() => slides[0]?.id ?? null);
  const [globalStyle, setGlobalStyle] = useState<SlideStyle>(DEFAULT_GLOBAL_STYLE);
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');
  const [customCanvas, setCustomCanvas] = useState<CustomCanvasSize>({ width: 1920, height: 1080 });
  const [operatorError, setOperatorError] = useState<OperatorError | null>(null);

  // Bible database states
  const [bibleVersion, setBibleVersion] = useState<BibleVersion>('rvr1960');
  const [bibleData, setBibleData] = useState<BibleData | null>(null);
  const [bibleLoading, setBibleLoading] = useState<boolean>(false);
  const bibleCache = useRef<Record<string, BibleData>>({});

  // Export progress states
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>('');

  const canvasRef = useRef<HTMLDivElement>(null);

  // ─── Operator dialog ───────────────────────────────────────────────────────

  const askOperator = (
    title: string,
    message: string,
    options: { label: string; value: string; variant?: 'primary' | 'secondary' | 'danger' }[],
  ): Promise<string> =>
    new Promise((resolve) => {
      setOperatorError({
        title,
        message,
        options: options.map((opt) => ({
          label: opt.label,
          variant: opt.variant,
          action: () => {
            setOperatorError(null);
            resolve(opt.value);
          },
        })),
      });
    });

  // ─── Confirmation / alert helpers (unified via operator dialog) ────────────

  const confirmDialog = (message: string): Promise<boolean> =>
    askOperator('Confirmar', message, [
      { label: 'Cancelar', value: 'cancel', variant: 'secondary' },
      { label: 'Aceptar', value: 'ok', variant: 'primary' },
    ]).then((v) => v === 'ok');

  const alertDialog = (message: string): Promise<void> =>
    askOperator('Aviso', message, [
      { label: 'Entendido', value: 'ok', variant: 'primary' },
    ]).then(() => undefined);

  // ─── Bible loading ─────────────────────────────────────────────────────────

  const fetchBibleVersion = async (version: string): Promise<BibleData | null> => {
    const key = version.toLowerCase();
    if (bibleCache.current[key]) return bibleCache.current[key];
    try {
      const response = await fetch(`/bibles/${key}.json`);
      if (response.ok) {
        const data: BibleData = await response.json();
        bibleCache.current[key] = data;
        return data;
      }
    } catch (err) {
      console.error(`Error loading Bible version ${key}:`, err);
    }
    return null;
  };

  useEffect(() => {
    const loadBible = async () => {
      if (bibleCache.current[bibleVersion]) {
        setBibleData(bibleCache.current[bibleVersion]);
        return;
      }
      setBibleLoading(true);
      try {
        const response = await fetch(`/bibles/${bibleVersion}.json`);
        if (!response.ok) throw new Error('Failed to load Bible JSON');
        const data: BibleData = await response.json();
        bibleCache.current[bibleVersion] = data;
        setBibleData(data);
      } catch (err) {
        console.error('Error loading Bible:', err);
      } finally {
        setBibleLoading(false);
      }
    };
    loadBible();
  }, [bibleVersion]);

  // ─── Slide navigation ──────────────────────────────────────────────────────

  const activeSlideIndex = slides.findIndex((s) => s.id === activeSlideId);
  const activeSlide = activeSlideIndex !== -1 ? slides[activeSlideIndex] : null;

  const handlePrevSlide = () => {
    if (activeSlideIndex > 0) setActiveSlideId(slides[activeSlideIndex - 1].id);
  };

  const handleNextSlide = () => {
    if (activeSlideIndex < slides.length - 1)
      setActiveSlideId(slides[activeSlideIndex + 1].id);
  };

  // ─── Slide management ──────────────────────────────────────────────────────

  const handleSelectSlide = (id: string) => setActiveSlideId(id);

  const handleAddSlide = () => {
    const newSlide = makeDefaultSlide();
    setSlides((prev) => [...prev, newSlide]);
    setActiveSlideId(newSlide.id);
  };

  const handleDeleteSlide = async (id: string) => {
    if (slides.length <= 1) {
      await alertDialog('Debes tener al menos una diapositiva en tu presentación.');
      return;
    }
    const filtered = slides.filter((s) => s.id !== id);
    setSlides(filtered);
    if (activeSlideId === id) setActiveSlideId(filtered[0].id);
  };

  const handleReorderSlides = (index1: number, index2: number) => {
    if (
      index1 < 0 || index1 >= slides.length ||
      index2 < 0 || index2 >= slides.length
    ) return;
    const newSlides = [...slides];
    [newSlides[index1], newSlides[index2]] = [newSlides[index2], newSlides[index1]];
    setSlides(newSlides);
  };

  // ─── Style management ──────────────────────────────────────────────────────

  const handleChangeGlobalStyle = (newStyle: SlideStyle) => setGlobalStyle(newStyle);

  const handleChangeSlideStyle = (newStyle: Partial<SlideStyle> | undefined) => {
    if (!activeSlideId) return;
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== activeSlideId) return s;
        if (newStyle === undefined) {
          const { customStyle: _removed, ...rest } = s;
          return rest;
        }
        return { ...s, customStyle: { ...(s.customStyle ?? {}), ...newStyle } };
      }),
    );
  };

  const handleApplyStyleToAll = async () => {
    if (!activeSlide?.customStyle) return;
    const confirmed = await confirmDialog(
      '¿Quieres aplicar este estilo a todas las diapositivas y borrar sus estilos personalizados?',
    );
    if (!confirmed) return;
    const mergedStyle = { ...globalStyle, ...activeSlide.customStyle };
    setGlobalStyle(mergedStyle);
    setSlides((prev) =>
      prev.map(({ customStyle: _removed, ...rest }) => rest),
    );
  };

  const handleAddVerseToSlides = (text: string, reference: string) => {
    const newSlide: Slide = {
      id: crypto.randomUUID(),
      text,
      reference,
      isVerse: true,
      extraBlocks: [],
    };
    setSlides((prev) => [...prev, newSlide]);
    setActiveSlideId(newSlide.id);
  };

  const handleClearAll = async () => {
    const confirmed = await confirmDialog(
      '¿Seguro que deseas limpiar la prédica y borrar todas las diapositivas creadas?',
    );
    if (!confirmed) return;
    setSermonText('');
    const fresh = makeDefaultSlide();
    setSlides([fresh]);
    setActiveSlideId(fresh.id);
  };

  // ─── Sermon → slides generation ────────────────────────────────────────────

  const handleGenerateSlides = async () => {
    if (!sermonText.trim()) return;

    setExportProgress('Procesando bosquejo de prédica y versículos...');
    setIsExporting(true);

    try {
      const parsedSlides = await parseSermonIntoSlides(
        sermonText,
        bibleVersion,
        fetchBibleVersion,
        askOperator,
      );

      if (parsedSlides.length > 0) {
        setSlides(parsedSlides);
        setActiveSlideId(parsedSlides[0].id);
      } else {
        await alertDialog('No se pudo extraer ninguna diapositiva del texto.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (!message.includes('Generación cancelada')) {
        await alertDialog('Ocurrió un error al generar las diapositivas.');
      }
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  // ─── Extra text blocks ─────────────────────────────────────────────────────

  const handleAddExtraBlock = () => {
    if (!activeSlideId) return;
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== activeSlideId) return s;
        if (s.extraBlocks.length >= 2) return s; // max 2 extra blocks
        return { ...s, extraBlocks: [...s.extraBlocks, makeDefaultBlock()] };
      }),
    );
  };

  const handleUpdateExtraBlock = (blockId: string, fields: Partial<TextBlock>) => {
    if (!activeSlideId) return;
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== activeSlideId) return s;
        return {
          ...s,
          extraBlocks: s.extraBlocks.map((b) =>
            b.id === blockId ? { ...b, ...fields } : b,
          ),
        };
      }),
    );
  };

  const handleDeleteExtraBlock = (blockId: string) => {
    if (!activeSlideId) return;
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== activeSlideId) return s;
        return { ...s, extraBlocks: s.extraBlocks.filter((b) => b.id !== blockId) };
      }),
    );
  };

  // ─── Export handlers ───────────────────────────────────────────────────────

  const withExport = async (fn: () => Promise<void>) => {
    setIsExporting(true);
    try {
      await fn();
    } catch (err) {
      console.error(err);
      await alertDialog('Ocurrió un error al exportar. Por favor intenta de nuevo.');
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  const handleExportCurrentJpg = () =>
    withExport(() =>
      exportCurrentJpg(activeSlide!, activeSlideIndex, globalStyle, viewportMode, setExportProgress, customCanvas),
    );

  const handleExportAllJpg = () =>
    withExport(() =>
      exportAllJpg(slides, globalStyle, viewportMode, setExportProgress, customCanvas),
    );

  const handleExportPdf = () =>
    withExport(() =>
      exportPdf(slides, globalStyle, viewportMode, setExportProgress, customCanvas),
    );

  const handleExportPptx = () =>
    withExport(() =>
      exportPptx(slides, globalStyle, viewportMode, setExportProgress, customCanvas),
    );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="app-container">
      {/* Left panel: Inputs, Bible searches */}
      <SermonInputPanel
        sermonText={sermonText}
        onChangeSermonText={setSermonText}
        onGenerateSlides={handleGenerateSlides}
        onClearAll={handleClearAll}
        bibleVersion={bibleVersion}
        onChangeBibleVersion={setBibleVersion}
        bibleData={bibleData}
        bibleLoading={bibleLoading}
        onAddVerseToSlides={handleAddVerseToSlides}
      />

      {/* Central panel: Viewport control, Slide canvas, and Filmstrip */}
      <div className="workspace">
        <div className="control-bar">
          <div className="viewport-selectors">
            <button
              className={`viewport-btn ${viewportMode === 'desktop' ? 'active' : ''}`}
              onClick={() => setViewportMode('desktop')}
            >
              <Monitor size={14} />
              Desktop 16:9
            </button>
            <button
              className={`viewport-btn ${viewportMode === 'tablet' ? 'active' : ''}`}
              onClick={() => setViewportMode('tablet')}
            >
              <Tablet size={14} />
              Tableta 4:3
            </button>
            <button
              className={`viewport-btn ${viewportMode === 'mobile' ? 'active' : ''}`}
              onClick={() => setViewportMode('mobile')}
            >
              <Smartphone size={14} />
              Móvil 9:16
            </button>
            <button
              className={`viewport-btn ${viewportMode === 'custom' ? 'active' : ''}`}
              onClick={() => setViewportMode('custom')}
            >
              <Maximize2 size={14} />
              Custom
            </button>
          </div>

          {/* Custom canvas size inputs */}
          {viewportMode === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number"
                min={100}
                max={7680}
                value={customCanvas.width}
                onChange={(e) => setCustomCanvas(prev => ({ ...prev, width: Math.max(100, parseInt(e.target.value) || 1920) }))}
                style={{
                  width: '72px', padding: '4px 8px', fontSize: '12px', fontWeight: '600',
                  background: 'var(--bg-deep)', border: '1px solid var(--border-subtle)',
                  borderRadius: '6px', color: 'var(--text-main)', textAlign: 'center',
                }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700' }}>×</span>
              <input
                type="number"
                min={100}
                max={7680}
                value={customCanvas.height}
                onChange={(e) => setCustomCanvas(prev => ({ ...prev, height: Math.max(100, parseInt(e.target.value) || 1080) }))}
                style={{
                  width: '72px', padding: '4px 8px', fontSize: '12px', fontWeight: '600',
                  background: 'var(--bg-deep)', border: '1px solid var(--border-subtle)',
                  borderRadius: '6px', color: 'var(--text-main)', textAlign: 'center',
                }}
              />
              <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>px</span>
            </div>
          )}

          {/* Quick Slide Navigation */}
          {slides.length > 0 && (
            <div className="slide-number-nav">
              <button
                className="slide-nav-btn"
                onClick={handlePrevSlide}
                disabled={activeSlideIndex <= 0}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="slide-nav-indicator">
                {activeSlideIndex !== -1 ? activeSlideIndex + 1 : 0} / {slides.length}
              </span>
              <button
                className="slide-nav-btn"
                onClick={handleNextSlide}
                disabled={activeSlideIndex >= slides.length - 1}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Live Preview Canvas */}
        <SlidePreview
          slide={activeSlide}
          globalStyle={globalStyle}
          viewportMode={viewportMode}
          customCanvas={customCanvas}
          canvasRef={canvasRef}
        />

        {/* Filmstrip: horizontal slide list below the canvas */}
        <div className="filmstrip">
          <div className="filmstrip-scroll">
            {/* "Nueva" — adds a single blank slide manually */}
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px', flexShrink: 0, height: '56px', whiteSpace: 'nowrap' }}
              onClick={handleAddSlide}
            >
              <Plus size={14} />
              Nueva
            </button>

            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                className={`slide-thumb-card ${activeSlideId === slide.id ? 'active' : ''}`}
                onClick={() => handleSelectSlide(slide.id)}
              >
                <div className="slide-thumb-index">{idx + 1}</div>

                <div className="slide-thumb-info">
                  <span className="slide-thumb-text">{slide.text || '(Vacía)'}</span>
                  {slide.reference && (
                    <span className="slide-thumb-ref">{slide.reference}</span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button
                      className="slide-thumb-delete"
                      style={{ opacity: idx > 0 ? undefined : 0.3 }}
                      disabled={idx === 0}
                      onClick={(e) => { e.stopPropagation(); handleReorderSlides(idx, idx - 1); }}
                      title="Mover izquierda"
                    >
                      <ChevronUp size={11} />
                    </button>
                    <button
                      className="slide-thumb-delete"
                      style={{ opacity: idx < slides.length - 1 ? undefined : 0.3 }}
                      disabled={idx === slides.length - 1}
                      onClick={(e) => { e.stopPropagation(); handleReorderSlides(idx, idx + 1); }}
                      title="Mover derecha"
                    >
                      <ChevronDown size={11} />
                    </button>
                  </div>
                  <button
                    className="slide-thumb-delete"
                    onClick={(e) => { e.stopPropagation(); handleDeleteSlide(slide.id); }}
                    title="Eliminar diapositiva"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel: Typography, alignment, colors, backgrounds, export operations */}
      <EditorPanel
        activeSlide={activeSlide}
        globalStyle={globalStyle}
        onChangeGlobalStyle={handleChangeGlobalStyle}
        onChangeSlideStyle={handleChangeSlideStyle}
        onApplyStyleToAll={handleApplyStyleToAll}
        onAddExtraBlock={handleAddExtraBlock}
        onUpdateExtraBlock={handleUpdateExtraBlock}
        onDeleteExtraBlock={handleDeleteExtraBlock}
        onExportCurrentJpg={handleExportCurrentJpg}
        onExportAllJpg={handleExportAllJpg}
        onExportPdf={handleExportPdf}
        onExportPptx={handleExportPptx}
        isExporting={isExporting}
        exportProgress={exportProgress}
      />

      {/* Operator Warning / Error Dialog Modal */}
      {operatorError && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <AlertTriangle size={24} color="#f59e0b" style={{ flexShrink: 0 }} />
              <h3>{operatorError.title}</h3>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{operatorError.message}</p>
            </div>
            <div className="modal-actions">
              {operatorError.options.map((opt, idx) => (
                <button
                  key={idx}
                  className={`modal-btn ${opt.variant ?? 'secondary'}`}
                  onClick={opt.action}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
