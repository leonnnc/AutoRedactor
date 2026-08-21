import React, { useRef, useState } from 'react';
import type { Slide, SlideBackground } from '../types';
import {
  Image as ImageIcon, Download, Sliders,
  FileText, FileImage, Presentation, Check,
} from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditorPanelProps {
  activeSlide: Slide | null;
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
  activeSlide,
  onUpdateBackground, onApplyBgToAll,
  onExportCurrentJpg, onExportAllJpg, onExportPdf, onExportPptx,
  isExporting, exportProgress,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const splitFileInputRef = useRef<HTMLInputElement>(null);
  const [bgSubTab, setBgSubTab] = useState<'bg1' | 'bg2' | 'split'>('bg1');
  const bg = activeSlide?.background;

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

  const handleSplitImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string')
        upBg({ splitBackgroundType: 'image', splitBackgroundImage: reader.result });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="panel right">
      <div className="panel-header">
        <h2 className="panel-title"><Sliders size={18} />Estilos y Diseño</h2>
      </div>

      <div className="panel-content">

        {/* ── UNIFIED BACKGROUND CONTROL ── */}
        {bg && (
          <div className="form-group" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span className="form-label" style={{ margin: 0, fontSize: '12px' }}>Fondo de Diapositiva</span>
              <button className="btn btn-secondary" style={{ fontSize: '10px', padding: '3px 8px' }} onClick={onApplyBgToAll}>
                Aplicar a todas
              </button>
            </div>

            {/* Mode selector: Fondo Único vs Doble Fondo */}
            <div className="tabs-header" style={{ marginBottom: '10px' }}>
              <button
                className={`tab-btn ${!bg.splitEnabled ? 'active' : ''}`}
                onClick={() => upBg({ splitEnabled: false })}
                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <span>◻️</span> Fondo Único
              </button>
              <button
                className={`tab-btn ${bg.splitEnabled ? 'active' : ''}`}
                onClick={() => upBg({ splitEnabled: true })}
                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <span>🌓</span> Doble Fondo
              </button>
            </div>

            {/* Sub-tabs for Doble Fondo: Fondo 1 / Fondo 2 / División */}
            {bg.splitEnabled && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '12px', background: 'var(--bg-deep)', padding: '3px', borderRadius: '8px' }}>
                <button
                  className={`btn btn-secondary ${bgSubTab === 'bg1' ? 'active' : ''}`}
                  style={{ fontSize: '10px', padding: '5px 2px', borderRadius: '6px' }}
                  onClick={() => setBgSubTab('bg1')}
                >
                  1️⃣ Fondo 1
                </button>
                <button
                  className={`btn btn-secondary ${bgSubTab === 'bg2' ? 'active' : ''}`}
                  style={{ fontSize: '10px', padding: '5px 2px', borderRadius: '6px' }}
                  onClick={() => setBgSubTab('bg2')}
                >
                  2️⃣ Fondo 2
                </button>
                <button
                  className={`btn btn-secondary ${bgSubTab === 'split' ? 'active' : ''}`}
                  style={{ fontSize: '10px', padding: '5px 2px', borderRadius: '6px' }}
                  onClick={() => setBgSubTab('split')}
                >
                  ✂️ División
                </button>
              </div>
            )}

            {/* ── PANEL: FONDO 1 (Single mode OR bgSubTab === 'bg1') ── */}
            {(!bg.splitEnabled || bgSubTab === 'bg1') && (
              <div>
                {bg.splitEnabled && (
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '8px' }}>
                    Configuración de Fondo 1 (Base):
                  </div>
                )}

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
              </div>
            )}

            {/* ── PANEL: FONDO 2 (Doble mode & bgSubTab === 'bg2') ── */}
            {bg.splitEnabled && bgSubTab === 'bg2' && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent-primary)', marginBottom: '8px' }}>
                  Configuración de Fondo 2 (Secundario):
                </div>

                <div className="tabs-header" style={{ marginBottom: '10px' }}>
                  {(['solid', 'gradient', 'image'] as const).map((t) => (
                    <button key={t} className={`tab-btn ${(bg.splitBackgroundType ?? 'solid') === t ? 'active' : ''}`}
                      onClick={() => upBg({ splitBackgroundType: t })}>
                      {t === 'solid' ? 'Sólido' : t === 'gradient' ? 'Degradado' : 'Imagen'}
                    </button>
                  ))}
                </div>

                {(bg.splitBackgroundType ?? 'solid') === 'solid' && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="color"
                      value={bg.splitBackgroundColor ?? '#1e293b'}
                      onChange={(e) => upBg({ splitBackgroundColor: e.target.value })}
                      style={{ width: '40px', height: '40px', cursor: 'pointer', border: '1px solid var(--border-subtle)', borderRadius: '8px', backgroundColor: 'transparent' }} />
                    <input type="text" className="form-input" style={{ flex: 1 }}
                      value={bg.splitBackgroundColor ?? '#1e293b'}
                      onChange={(e) => upBg({ splitBackgroundColor: e.target.value })} />
                  </div>
                )}

                {(bg.splitBackgroundType ?? 'solid') === 'gradient' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div className="preset-grid">
                      {PRESET_GRADIENTS.map((g, i) => (
                        <button key={i}
                          className={`preset-card ${(bg.splitBackgroundGradient ?? '') === g.value ? 'active' : ''}`}
                          style={{ background: g.value, height: '32px', border: 'none', color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                          onClick={() => upBg({ splitBackgroundGradient: g.value })}>
                          {(bg.splitBackgroundGradient ?? '') === g.value && <Check size={10} style={{ marginRight: '2px' }} />}{g.name}
                        </button>
                      ))}
                    </div>
                    <textarea className="form-textarea" style={{ minHeight: '44px', fontSize: '10px' }}
                      value={bg.splitBackgroundGradient ?? ''}
                      onChange={(e) => upBg({ splitBackgroundGradient: e.target.value })} />
                  </div>
                )}

                {bg.splitBackgroundType === 'image' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="preset-grid">
                      {PRESET_IMAGES.map((img, i) => (
                        <button key={i} className={`preset-card ${(bg.splitBackgroundImage ?? '') === img.value ? 'active' : ''}`}
                          style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)),url(${img.value})`, backgroundSize: 'cover', backgroundPosition: 'center', height: '32px', border: 'none', color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => upBg({ splitBackgroundImage: img.value })}>
                          {(bg.splitBackgroundImage ?? '') === img.value && <Check size={10} style={{ marginRight: '2px' }} />}{img.name}
                        </button>
                      ))}
                    </div>
                    <input type="text" className="form-input" placeholder="URL de imagen para fondo 2..."
                      value={(bg.splitBackgroundImage ?? '').startsWith('data:') ? '' : (bg.splitBackgroundImage ?? '')}
                      onChange={(e) => upBg({ splitBackgroundImage: e.target.value })} />
                    <button className="btn btn-secondary" style={{ fontSize: '12px' }} onClick={() => splitFileInputRef.current?.click()}>
                      <ImageIcon size={13} /> Subir imagen al 2° fondo
                    </button>
                    <input type="file" ref={splitFileInputRef} accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      onChange={handleSplitImageUpload} style={{ display: 'none' }} />

                    {/* Image controls for split bg */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div>
                        <span className="form-label" style={{ fontSize: '10px' }}>Posición</span>
                        <select className="form-select" value={bg.splitBgPosition ?? 'center'} onChange={(e) => upBg({ splitBgPosition: e.target.value as any })}>
                          {(['center','top','bottom','left','right'] as const).map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <span className="form-label" style={{ fontSize: '10px' }}>Escala</span>
                        <select className="form-select" value={bg.splitBgSize ?? 'cover'} onChange={(e) => upBg({ splitBgSize: e.target.value as any })}>
                          <option value="cover">Cover</option>
                          <option value="contain">Contain</option>
                          <option value="auto">Auto</option>
                        </select>
                      </div>
                    </div>

                    <Row label="Desenfoque 2° fondo" value={(bg.splitBgBlur ?? 0) > 0 ? `${bg.splitBgBlur}px` : 'Off'}>
                      <Slider min={0} max={20} value={bg.splitBgBlur ?? 0} onChange={(v) => upBg({ splitBgBlur: v })} />
                    </Row>
                  </div>
                )}
              </div>
            )}

            {/* ── PANEL: DIVISIÓN (Doble mode & bgSubTab === 'split') ── */}
            {bg.splitEnabled && bgSubTab === 'split' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent-primary)' }}>
                  Ajustes de la División:
                </div>

                {/* Direction */}
                <div>
                  <span className="form-label" style={{ fontSize: '10px' }}>Orientación del corte</span>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    {(['vertical', 'horizontal'] as const).map((dir) => (
                      <button key={dir}
                        className={`btn btn-secondary ${(bg.splitDirection ?? 'vertical') === dir ? 'active' : ''}`}
                        style={{ flex: 1, fontSize: '11px', padding: '5px' }}
                        onClick={() => upBg({ splitDirection: dir })}>
                        {dir === 'vertical' ? '⬛⬜ Izq / Der' : '⬛\n⬜ Arr / Abajo'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Position slider */}
                <Row
                  label={(bg.splitDirection ?? 'vertical') === 'vertical' ? 'Posición (←→)' : 'Posición (↑↓)'}
                  value={`${bg.splitPosition ?? 50}%`}>
                  <Slider min={5} max={95} value={bg.splitPosition ?? 50}
                    onChange={(v) => upBg({ splitPosition: v })} />
                </Row>

                {/* Aspect / Style of Division */}
                <div>
                  <span className="form-label" style={{ fontSize: '10px' }}>Aspecto de la división</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginTop: '4px' }}>
                    {[
                      { id: 'none', label: 'Limpio', icon: '🚫' },
                      { id: 'shadow', label: 'Sombra', icon: '🌫️' },
                      { id: 'border', label: 'Borde', icon: '📏' },
                      { id: 'feather', label: 'Suave', icon: '🌊' },
                      { id: 'diagonal', label: 'Diagonal', icon: '📐' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        className={`btn btn-secondary ${(bg.splitDividerStyle ?? 'none') === item.id ? 'active' : ''}`}
                        style={{
                          fontSize: '9px',
                          padding: '4px 2px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                        onClick={() => upBg({ splitDividerStyle: item.id as any })}
                      >
                        <span style={{ fontSize: '12px' }}>{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional options for division aspect */}
                {(bg.splitDividerStyle === 'border') && (
                  <div style={{ background: 'var(--bg-deep)', padding: '8px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Row label="Grosor del borde" value={`${bg.splitBorderWidth ?? 2}px`}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <Slider min={1} max={16} value={bg.splitBorderWidth ?? 2} onChange={(v) => upBg({ splitBorderWidth: v })} />
                        <input type="color" value={bg.splitBorderColor ?? '#ffffff'} onChange={(e) => upBg({ splitBorderColor: e.target.value })}
                          style={{ width: '26px', height: '26px', cursor: 'pointer', border: 'none', borderRadius: '4px' }} />
                      </div>
                    </Row>
                  </div>
                )}

                {(bg.splitDividerStyle === 'diagonal') && (
                  <div style={{ background: 'var(--bg-deep)', padding: '8px', borderRadius: '6px' }}>
                    <Row label="Inclinación / Ángulo" value={`${bg.splitAngle ?? 10}°`}>
                      <Slider min={-30} max={30} value={bg.splitAngle ?? 10} onChange={(v) => upBg({ splitAngle: v })} />
                    </Row>
                  </div>
                )}

                <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                  💡 Puedes arrastrar el tirador en el canvas. En el trabajo final exportado se verá limpio sin ningún botón ni tirador.
                </p>
              </div>
            )}

            {/* Slide FX */}
            <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '10px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
