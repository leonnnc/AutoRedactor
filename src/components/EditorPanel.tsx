import React, { useRef } from 'react';
import type { Slide, CanvasElement, SlideBackground } from '../types';
import {
  AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Type, Image as ImageIcon,
  Download, Sliders, FileText, FileImage, Presentation, Check,
  Trash2, RotateCcw,
} from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditorPanelProps {
  activeSlide: Slide | null;
  selectedElement: CanvasElement | null;
  onUpdateElement: (id: string, fields: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onUpdateBackground: (fields: Partial<SlideBackground>) => void;
  onApplyBgToAll: () => void;
  onExportCurrentJpg: () => void;
  onExportAllJpg: () => void;
  onExportPdf: () => void;
  onExportPptx: () => void;
  isExporting: boolean;
  exportProgress: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const FONTS = [
  { name: 'Inter',             value: "'Inter', sans-serif" },
  { name: 'Montserrat',        value: "'Montserrat', sans-serif" },
  { name: 'Playfair Display',  value: "'Playfair Display', serif" },
  { name: 'Lora',              value: "'Lora', serif" },
  { name: 'Cinzel',            value: "'Cinzel', serif" },
  { name: 'System Default',    value: 'system-ui, sans-serif' },
];

const PRESET_COLORS = ['#ffffff','#f3f4f6','#fde047','#a7f3d0','#bfdbfe','#fbcfe8','#fed7aa','#c084fc'];

const PRESET_GRADIENTS = [
  { name: 'Midnight Purple', value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)' },
  { name: 'Warm Ember',      value: 'linear-gradient(135deg, #180808 0%, #280f08 50%, #3b1008 100%)' },
  { name: 'Deep Sea',        value: 'linear-gradient(135deg, #020617 0%, #071e3d 60%, #0d346c 100%)' },
  { name: 'Slate Gray',      value: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' },
  { name: 'Forest Shadow',   value: 'linear-gradient(135deg, #050b0a 0%, #0d1e1c 60%, #16302b 100%)' },
  { name: 'Burgundy Wine',   value: 'linear-gradient(135deg, #110307 0%, #27060f 60%, #3e0c1b 100%)' },
];

const PRESET_IMAGES = [
  { name: 'Cielo Estrellado',   value: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=1920' },
  { name: 'Textura Oscura',     value: 'https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?q=80&w=1920' },
  { name: 'Montaña Silenciosa', value: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1920' },
  { name: 'Cruces Abstractas',  value: 'https://images.unsplash.com/photo-1544427928-14206c4a30e6?q=80&w=1920' },
];

const OVERLAY_GRADIENTS = [
  { name: 'Abajo→Arriba', value: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 60%)' },
  { name: 'Arriba→Abajo', value: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 60%)' },
  { name: 'Izq→Der',      value: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 60%)' },
  { name: 'Radial',        value: 'radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 70%)' },
];

// ─── Small helpers ────────────────────────────────────────────────────────────

const Row: React.FC<{ label: string; value?: string | number; children: React.ReactNode }> = ({ label, value, children }) => (
  <div className="form-group">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
      <span className="form-label" style={{ margin: 0 }}>{label}</span>
      {value !== undefined && <span className="range-value" style={{ fontSize: '11px' }}>{value}</span>}
    </div>
    {children}
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <label className="toggle-switch">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="toggle-slider" />
  </label>
);

const Slider: React.FC<{ min: number; max: number; step?: number; value: number; onChange: (v: number) => void }> = ({ min, max, step = 1, value, onChange }) => (
  <input type="range" className="range-slider" min={min} max={max} step={step} value={value}
    onChange={(e) => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))} />
);

// ─── Main component ───────────────────────────────────────────────────────────

export const EditorPanel: React.FC<EditorPanelProps> = ({
  activeSlide, selectedElement,
  onUpdateElement, onDeleteElement,
  onUpdateBackground, onApplyBgToAll,
  onExportCurrentJpg, onExportAllJpg, onExportPdf, onExportPptx,
  isExporting, exportProgress,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bg = activeSlide?.background;

  const upEl = (fields: Partial<CanvasElement>) => {
    if (selectedElement) onUpdateElement(selectedElement.id, fields);
  };

  const upBg = (fields: Partial<SlideBackground>) => {
    if (bg !== undefined) onUpdateBackground(fields);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string')
        upBg({ backgroundType: 'image', backgroundImage: reader.result });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="panel right">
      <div className="panel-header">
        <h2 className="panel-title"><Sliders size={18} />Estilos y Diseño</h2>
      </div>

      <div className="panel-content">

        {/* ── ELEMENT PROPERTIES ── */}
        {selectedElement ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="form-label" style={{ margin: 0 }}>Elemento seleccionado</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}
                  title="Quitar selección" onClick={() => {}}>
                  <RotateCcw size={12} />
                </button>
                <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '11px' }}
                  onClick={() => onDeleteElement(selectedElement.id)} title="Eliminar elemento">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Text content */}
            <Row label="Texto">
              <textarea className="form-textarea" style={{ minHeight: '72px', fontSize: '13px' }}
                value={selectedElement.text}
                onChange={(e) => upEl({ text: e.target.value })} />
            </Row>

            {/* Font */}
            <Row label="Tipografía">
              <select className="form-select" value={selectedElement.fontFamily}
                onChange={(e) => upEl({ fontFamily: e.target.value })}>
                {FONTS.map((f) => <option key={f.value} value={f.value}>{f.name}</option>)}
              </select>
            </Row>

            {/* Format row */}
            <Row label="Formato">
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <div className="align-group" style={{ flex: 1 }}>
                  <button className={`align-btn ${selectedElement.bold ? 'active' : ''}`} onClick={() => upEl({ bold: !selectedElement.bold })}><Bold size={15}/></button>
                  <button className={`align-btn ${selectedElement.italic ? 'active' : ''}`} onClick={() => upEl({ italic: !selectedElement.italic })}><Italic size={15}/></button>
                  <button className={`align-btn ${selectedElement.uppercase ? 'active' : ''}`} onClick={() => upEl({ uppercase: !selectedElement.uppercase })}><Type size={15}/></button>
                </div>
                <input type="color" value={selectedElement.color.startsWith('#') ? selectedElement.color : '#ffffff'}
                  onChange={(e) => upEl({ color: e.target.value })}
                  style={{ width: '34px', height: '34px', padding: '2px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-deep)' }} />
              </div>
              <div className="color-picker-row" style={{ marginTop: '4px' }}>
                {PRESET_COLORS.map((c) => (
                  <div key={c} className={`color-swatch ${selectedElement.color.toLowerCase() === c ? 'active' : ''}`}
                    style={{ backgroundColor: c }} onClick={() => upEl({ color: c })} />
                ))}
              </div>
            </Row>

            {/* Text align */}
            <Row label="Alineación">
              <div className="align-group">
                {(['left','center','right'] as const).map((a) => (
                  <button key={a} className={`align-btn ${selectedElement.textAlign === a ? 'active' : ''}`}
                    onClick={() => upEl({ textAlign: a })}>
                    {a === 'left' ? <AlignLeft size={15}/> : a === 'center' ? <AlignCenter size={15}/> : <AlignRight size={15}/>}
                  </button>
                ))}
              </div>
            </Row>

            {/* Size */}
            <Row label="Tamaño" value={`${selectedElement.fontSize}px`}>
              <Slider min={12} max={200} value={selectedElement.fontSize} onChange={(v) => upEl({ fontSize: v })} />
            </Row>

            {/* Line height */}
            <Row label="Interlineado" value={selectedElement.lineHeight.toFixed(1)}>
              <Slider min={1} max={3} step={0.1} value={selectedElement.lineHeight} onChange={(v) => upEl({ lineHeight: v })} />
            </Row>

            {/* Opacity */}
            <Row label="Opacidad" value={`${Math.round(selectedElement.opacity * 100)}%`}>
              <Slider min={0} max={1} step={0.05} value={selectedElement.opacity} onChange={(v) => upEl({ opacity: v })} />
            </Row>

            {/* Rotation */}
            <Row label="Rotación" value={`${selectedElement.rotation}°`}>
              <Slider min={-180} max={180} value={selectedElement.rotation} onChange={(v) => upEl({ rotation: v })} />
            </Row>

            {/* Position & size manual inputs */}
            <Row label="Posición y tamaño (%)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {(['x','y','w','h'] as const).map((prop) => (
                  <div key={prop} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-disabled)', textTransform: 'uppercase' }}>{prop}</span>
                    <input type="number" className="form-input" style={{ padding: '4px 8px', fontSize: '12px', textAlign: 'center' }}
                      min={0} max={100} step={0.5}
                      value={Math.round(selectedElement[prop] * 10) / 10}
                      onChange={(e) => upEl({ [prop]: parseFloat(e.target.value) || 0 })} />
                  </div>
                ))}
              </div>
            </Row>

            {/* Text shadow */}
            <div className="form-group" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <div className="toggle-switch-container">
                <span className="form-label">Sombra de texto</span>
                <Toggle checked={selectedElement.textShadow} onChange={(v) => upEl({ textShadow: v })} />
              </div>
            </div>

            {/* Reference toggle */}
            <div className="form-group">
              <div className="toggle-switch-container">
                <span className="form-label" style={{ fontSize: '10px', textTransform: 'none' }}>Estilo de cita bíblica</span>
                <Toggle checked={selectedElement.isReference} onChange={(v) => upEl({ isReference: v })} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '4px' }} />
          </>
        ) : (
          <div style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-disabled)', textAlign: 'center' }}>
            Haz clic en un elemento del canvas para editarlo, o usa <strong style={{ color: 'var(--text-muted)' }}>+ Texto</strong> para agregar uno.
          </div>
        )}

        {/* ── BACKGROUND ── */}
        {bg && (
          <div className="form-group" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="form-label" style={{ margin: 0 }}>Fondo de Diapositiva</span>
              <button className="btn btn-secondary" style={{ fontSize: '10px', padding: '3px 8px' }} onClick={onApplyBgToAll}>
                Aplicar a todas
              </button>
            </div>

            <div className="tabs-header" style={{ marginBottom: '10px' }}>
              {(['solid','gradient','image'] as const).map((t) => (
                <button key={t} className={`tab-btn ${bg.backgroundType === t ? 'active' : ''}`}
                  onClick={() => upBg({ backgroundType: t })}>
                  {t === 'solid' ? 'Sólido' : t === 'gradient' ? 'Degradado' : 'Imagen'}
                </button>
              ))}
            </div>

            {bg.backgroundType === 'solid' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="color" value={bg.backgroundColor} onChange={(e) => upBg({ backgroundColor: e.target.value })}
                  style={{ width: '40px', height: '40px', cursor: 'pointer', border: '1px solid var(--border-subtle)', borderRadius: '8px', backgroundColor: 'transparent' }} />
                <input type="text" className="form-input" style={{ flex: 1 }} value={bg.backgroundColor}
                  onChange={(e) => upBg({ backgroundColor: e.target.value })} />
              </div>
            )}

            {bg.backgroundType === 'gradient' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="preset-grid">
                  {PRESET_GRADIENTS.map((g, i) => (
                    <button key={i} className={`preset-card ${bg.backgroundGradient === g.value ? 'active' : ''}`}
                      style={{ background: g.value, height: '36px', border: 'none', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                      onClick={() => upBg({ backgroundGradient: g.value })}>
                      {bg.backgroundGradient === g.value && <Check size={11} style={{ marginRight: '3px' }} />}{g.name}
                    </button>
                  ))}
                </div>
                <textarea className="form-textarea" style={{ minHeight: '50px', fontSize: '11px' }}
                  value={bg.backgroundGradient} onChange={(e) => upBg({ backgroundGradient: e.target.value })} />
              </div>
            )}

            {bg.backgroundType === 'image' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="preset-grid">
                  {PRESET_IMAGES.map((img, i) => (
                    <button key={i} className={`preset-card ${bg.backgroundImage === img.value ? 'active' : ''}`}
                      style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)),url(${img.value})`, backgroundSize: 'cover', backgroundPosition: 'center', height: '36px', border: 'none', color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => upBg({ backgroundImage: img.value })}>
                      {bg.backgroundImage === img.value && <Check size={10} style={{ marginRight: '2px' }} />}{img.name}
                    </button>
                  ))}
                </div>
                <input type="text" className="form-input" placeholder="URL de imagen..."
                  value={bg.backgroundImage.startsWith('data:') ? '' : bg.backgroundImage}
                  onChange={(e) => upBg({ backgroundImage: e.target.value })} />
                <button className="btn btn-secondary" style={{ fontSize: '12px' }} onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon size={13} /> Subir imagen
                </button>
                <input type="file" ref={fileInputRef} accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={handleImageUpload} style={{ display: 'none' }} />

                {/* Image controls */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>
                    <span className="form-label" style={{ fontSize: '10px' }}>Posición</span>
                    <select className="form-select" value={bg.bgPosition} onChange={(e) => upBg({ bgPosition: e.target.value as any })}>
                      {(['center','top','bottom','left','right'] as const).map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <span className="form-label" style={{ fontSize: '10px' }}>Escala</span>
                    <select className="form-select" value={bg.bgSize} onChange={(e) => upBg({ bgSize: e.target.value as any })}>
                      <option value="cover">Cover</option>
                      <option value="contain">Contain</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                </div>

                <Row label="Desenfoque" value={bg.bgBlur > 0 ? `${bg.bgBlur}px` : 'Off'}>
                  <Slider min={0} max={20} value={bg.bgBlur} onChange={(v) => upBg({ bgBlur: v })} />
                </Row>

                {/* Overlay */}
                <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '8px' }}>
                  <Row label="Capa oscura" value={`${Math.round(bg.overlayOpacity * 100)}%`}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <Slider min={0} max={1} step={0.05} value={bg.overlayOpacity} onChange={(v) => upBg({ overlayOpacity: v })} />
                      <input type="color" value={bg.overlayColor} onChange={(e) => upBg({ overlayColor: e.target.value })}
                        style={{ width: '26px', height: '26px', cursor: 'pointer', border: 'none', borderRadius: '4px' }} />
                    </div>
                  </Row>
                  <div className="toggle-switch-container">
                    <span className="form-label" style={{ fontSize: '10px', textTransform: 'none' }}>Degradado de sombra</span>
                    <Toggle checked={bg.overlayGradient} onChange={(v) => upBg({ overlayGradient: v })} />
                  </div>
                  {bg.overlayGradient && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {OVERLAY_GRADIENTS.map((og, i) => (
                        <button key={i} className={`btn btn-secondary ${bg.overlayGradientValue === og.value ? 'active' : ''}`}
                          style={{ fontSize: '10px', padding: '3px 6px' }}
                          onClick={() => upBg({ overlayGradientValue: og.value })}>{og.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Slide FX */}
            <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '10px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Row label="Viñeta" value={bg.vignetteOpacity > 0 ? `${Math.round(bg.vignetteOpacity * 100)}%` : 'Off'}>
                <Slider min={0} max={1} step={0.05} value={bg.vignetteOpacity} onChange={(v) => upBg({ vignetteOpacity: v })} />
              </Row>
              <div className="toggle-switch-container">
                <span className="form-label" style={{ fontSize: '10px', textTransform: 'none' }}>Sombra interior</span>
                <Toggle checked={bg.innerShadow} onChange={(v) => upBg({ innerShadow: v })} />
              </div>
            </div>

            {/* Global text shadow settings */}
            <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '10px', marginTop: '4px' }}>
              <Row label="Sombra de texto (blur)" value={`${bg.textShadowBlur}px`}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <Slider min={1} max={20} value={bg.textShadowBlur} onChange={(v) => upBg({ textShadowBlur: v })} />
                  <input type="color" value={bg.textShadowColor} onChange={(e) => upBg({ textShadowColor: e.target.value })}
                    style={{ width: '26px', height: '26px', cursor: 'pointer', border: 'none', borderRadius: '4px' }} />
                </div>
              </Row>
            </div>
          </div>
        )}

        {/* ── EXPORT ── */}
        <div className="form-group" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginBottom: '20px' }}>
          <span className="form-label">Exportar</span>
          <div className="export-grid">
            <button className="export-btn" onClick={onExportCurrentJpg} disabled={isExporting || !activeSlide}><FileImage size={18}/>JPG Actual</button>
            <button className="export-btn" onClick={onExportAllJpg} disabled={isExporting || !activeSlide}><Download size={18}/>ZIP Imágenes</button>
            <button className="export-btn" onClick={onExportPdf} disabled={isExporting || !activeSlide}><FileText size={18}/>PDF</button>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}
            onClick={onExportPptx} disabled={isExporting || !activeSlide}>
            <Presentation size={15}/>Exportar PowerPoint (.pptx)
          </button>
        </div>

      </div>

      {isExporting && (
        <div className="loading-overlay">
          <div className="spinner" />
          <div style={{ fontSize: '14px', fontWeight: '600' }}>{exportProgress || 'Procesando...'}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No cierres la ventana.</div>
        </div>
      )}
    </div>
  );
};
