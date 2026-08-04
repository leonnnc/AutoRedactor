import React, { useRef, useState } from 'react';
import type { Slide, SlideStyle, TextBlock } from '../types';
import {
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Bold, Italic, Type, Image as ImageIcon, Download,
  Layers, Globe, Sliders, FileText, FileImage,
  Presentation, Check, Plus, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react';

interface EditorPanelProps {
  activeSlide: Slide | null;
  globalStyle: SlideStyle;
  onChangeGlobalStyle: (style: SlideStyle) => void;
  onChangeSlideStyle: (style: Partial<SlideStyle> | undefined) => void;
  onApplyStyleToAll: () => void;
  onAddExtraBlock: () => void;
  onUpdateExtraBlock: (blockId: string, fields: Partial<TextBlock>) => void;
  onDeleteExtraBlock: (blockId: string) => void;
  onExportCurrentJpg: () => void;
  onExportAllJpg: () => void;
  onExportPdf: () => void;
  onExportPptx: () => void;
  isExporting: boolean;
  exportProgress: string;
}

const FONTS = [
  { name: 'Inter (Sleek UI)', value: "'Inter', sans-serif" },
  { name: 'Montserrat (Bold)', value: "'Montserrat', sans-serif" },
  { name: 'Playfair Display (Serif)', value: "'Playfair Display', serif" },
  { name: 'Lora (Classic Book)', value: "'Lora', serif" },
  { name: 'Cinzel (Elegant Stone)', value: "'Cinzel', serif" },
  { name: 'System Default', value: 'system-ui, sans-serif' },
];

const PRESET_COLORS = [
  '#ffffff', '#f3f4f6', '#fde047', '#a7f3d0',
  '#bfdbfe', '#fbcfe8', '#fed7aa', '#c084fc',
];

const PRESET_GRADIENTS = [
  { name: 'Midnight Purple', value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)' },
  { name: 'Warm Ember',      value: 'linear-gradient(135deg, #180808 0%, #280f08 50%, #3b1008 100%)' },
  { name: 'Deep Sea',        value: 'linear-gradient(135deg, #020617 0%, #071e3d 60%, #0d346c 100%)' },
  { name: 'Slate Gray',      value: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' },
  { name: 'Forest Shadow',   value: 'linear-gradient(135deg, #050b0a 0%, #0d1e1c 60%, #16302b 100%)' },
  { name: 'Burgundy Wine',   value: 'linear-gradient(135deg, #110307 0%, #27060f 60%, #3e0c1b 100%)' },
];

const PRESET_IMAGES = [
  { name: 'Cielo Estrellado',    value: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=1920' },
  { name: 'Textura Oscura',      value: 'https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?q=80&w=1920' },
  { name: 'Montaña Silenciosa',  value: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1920' },
  { name: 'Cruces Abstractas',   value: 'https://images.unsplash.com/photo-1544427928-14206c4a30e6?q=80&w=1920' },
];

const OVERLAY_GRADIENTS = [
  { name: 'Abajo → Arriba',  value: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 60%)' },
  { name: 'Arriba → Abajo',  value: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 60%)' },
  { name: 'Izq → Der',       value: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 60%)' },
  { name: 'Oscuro Centro',   value: 'radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 70%)' },
];

// ── Small reusable helper ────────────────────────────────────────────────────
const Label: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
    <span className="form-label" style={{ margin: 0 }}>{children}</span>
    {right && <span className="range-value" style={{ fontSize: '11px' }}>{right}</span>}
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <label className="toggle-switch">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="toggle-slider" />
  </label>
);

// ── Extra block accordion ─────────────────────────────────────────────────────
const ExtraBlockEditor: React.FC<{
  block: TextBlock;
  index: number;
  onUpdate: (fields: Partial<TextBlock>) => void;
  onDelete: () => void;
}> = ({ block, index, onUpdate, onDelete }) => {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden', marginTop: '8px' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-card)', cursor: 'pointer' }}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="form-label" style={{ margin: 0 }}>Bloque {index + 2}</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="slide-thumb-delete" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Eliminar bloque">
            <Trash2 size={12} />
          </button>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>
      {open && (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <textarea
            className="form-textarea"
            style={{ minHeight: '70px', fontSize: '13px' }}
            placeholder="Texto del bloque..."
            value={block.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
          />
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <select className="form-select" style={{ flex: 1 }} value={block.fontFamily} onChange={(e) => onUpdate({ fontFamily: e.target.value })}>
              {FONTS.map((f) => <option key={f.value} value={f.value}>{f.name}</option>)}
            </select>
            <input type="color" value={block.color} onChange={(e) => onUpdate({ color: e.target.value })}
              style={{ width: '32px', height: '32px', cursor: 'pointer', border: 'none', borderRadius: '4px' }} />
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Label right={`${block.fontSize}px`}>Tamaño</Label>
            <input type="range" className="range-slider" min="18" max="120" value={block.fontSize} onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })} style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['left','center','right','justify'] as const).map((a) => (
              <button key={a} className={`align-btn ${block.textAlign === a ? 'active' : ''}`} onClick={() => onUpdate({ textAlign: a })}>
                {a === 'left' ? <AlignLeft size={13}/> : a === 'center' ? <AlignCenter size={13}/> : a === 'right' ? <AlignRight size={13}/> : <AlignJustify size={13}/>}
              </button>
            ))}
            <button className={`align-btn ${block.bold ? 'active' : ''}`} onClick={() => onUpdate({ bold: !block.bold })}><Bold size={13}/></button>
            <button className={`align-btn ${block.italic ? 'active' : ''}`} onClick={() => onUpdate({ italic: !block.italic })}><Italic size={13}/></button>
            <button className={`align-btn ${block.uppercase ? 'active' : ''}`} onClick={() => onUpdate({ uppercase: !block.uppercase })}><Type size={13}/></button>
          </div>
          <div className="toggle-switch-container">
            <span className="form-label" style={{ margin: 0, fontSize: '10px' }}>Sombra de texto</span>
            <Toggle checked={block.textShadow} onChange={(v) => onUpdate({ textShadow: v })} />
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────
export const EditorPanel: React.FC<EditorPanelProps> = ({
  activeSlide, globalStyle, onChangeGlobalStyle, onChangeSlideStyle,
  onApplyStyleToAll, onAddExtraBlock, onUpdateExtraBlock, onDeleteExtraBlock,
  onExportCurrentJpg, onExportAllJpg, onExportPdf, onExportPptx,
  isExporting, exportProgress,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditingLocal = activeSlide !== null && activeSlide.customStyle !== undefined;
  const currentStyle: SlideStyle = activeSlide?.customStyle
    ? { ...globalStyle, ...activeSlide.customStyle }
    : globalStyle;

  const updateStyle = (fields: Partial<SlideStyle>) => {
    if (isEditingLocal) { onChangeSlideStyle(fields); }
    else { onChangeGlobalStyle({ ...globalStyle, ...fields }); }
  };

  const handleToggleScope = (scope: 'global' | 'local') => {
    if (!activeSlide) return;
    if (scope === 'local') onChangeSlideStyle({});
    else onChangeSlideStyle(undefined);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string')
        updateStyle({ backgroundType: 'image', backgroundImage: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const alignmentOptions = [
    { v: 'flex-start', h: 'flex-start', title: 'Arriba Izquierda' },
    { v: 'flex-start', h: 'center',     title: 'Arriba Centro' },
    { v: 'flex-start', h: 'flex-end',   title: 'Arriba Derecha' },
    { v: 'center',     h: 'flex-start', title: 'Centro Izquierda' },
    { v: 'center',     h: 'center',     title: 'Centro Centro' },
    { v: 'center',     h: 'flex-end',   title: 'Centro Derecha' },
    { v: 'flex-end',   h: 'flex-start', title: 'Abajo Izquierda' },
    { v: 'flex-end',   h: 'center',     title: 'Abajo Centro' },
    { v: 'flex-end',   h: 'flex-end',   title: 'Abajo Derecha' },
  ];

  return (
    <div className="panel right">
      <div className="panel-header">
        <h2 className="panel-title"><Sliders size={18} />Estilos y Diseño</h2>
      </div>
      <div className="panel-content">

        {/* ── Scope switcher ── */}
        {activeSlide && (
          <div className="form-group">
            <Label>Ámbito de Edición</Label>
            <div className="tabs-header">
              <button className={`tab-btn ${!isEditingLocal ? 'active' : ''}`} onClick={() => handleToggleScope('global')}><Globe size={14}/>Global</button>
              <button className={`tab-btn ${isEditingLocal ? 'active' : ''}`} onClick={() => handleToggleScope('local')}><Layers size={14}/>Solo Esta</button>
            </div>
            {isEditingLocal && (
              <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '6px' }} onClick={onApplyStyleToAll}>
                Aplicar este estilo a todas las diapositivas
              </button>
            )}
          </div>
        )}

        {/* ── Extra text blocks ── */}
        {activeSlide && (
          <div className="form-group" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="form-label" style={{ margin: 0 }}>Bloques de Texto Extra</span>
              {activeSlide.extraBlocks.length < 2 && (
                <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={onAddExtraBlock}>
                  <Plus size={12} /> Añadir Bloque
                </button>
              )}
            </div>
            {activeSlide.extraBlocks.length === 0 && (
              <p style={{ fontSize: '11px', color: 'var(--text-disabled)', marginTop: '6px' }}>
                Añade hasta 2 bloques adicionales de texto por diapositiva.
              </p>
            )}
            {activeSlide.extraBlocks.map((block, idx) => (
              <ExtraBlockEditor
                key={block.id}
                block={block}
                index={idx}
                onUpdate={(fields) => onUpdateExtraBlock(block.id, fields)}
                onDelete={() => onDeleteExtraBlock(block.id)}
              />
            ))}
          </div>
        )}

        {/* ── Typography ── */}
        <div className="form-group" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <Label>Tipografía Principal</Label>
          <select className="form-select" value={currentStyle.fontFamily} onChange={(e) => updateStyle({ fontFamily: e.target.value })}>
            {FONTS.map((f) => <option key={f.value} value={f.value}>{f.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <Label>Formato de Texto</Label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div className="align-group" style={{ flex: 1 }}>
              <button className={`align-btn ${currentStyle.bold ? 'active' : ''}`} onClick={() => updateStyle({ bold: !currentStyle.bold })} title="Negrita"><Bold size={16}/></button>
              <button className={`align-btn ${currentStyle.italic ? 'active' : ''}`} onClick={() => updateStyle({ italic: !currentStyle.italic })} title="Cursiva"><Italic size={16}/></button>
              <button className={`align-btn ${currentStyle.uppercase ? 'active' : ''}`} onClick={() => updateStyle({ uppercase: !currentStyle.uppercase })} title="Mayúsculas"><Type size={16}/></button>
            </div>
            <input type="color" value={currentStyle.color.startsWith('#') ? currentStyle.color : '#ffffff'} onChange={(e) => updateStyle({ color: e.target.value })}
              style={{ width: '36px', height: '36px', padding: '2px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-deep)' }} title="Color de Texto" />
          </div>
          <div className="color-picker-row" style={{ marginTop: '4px' }}>
            {PRESET_COLORS.map((c) => (
              <div key={c} className={`color-swatch ${currentStyle.color.toLowerCase() === c.toLowerCase() ? 'active' : ''}`}
                style={{ backgroundColor: c }} onClick={() => updateStyle({ color: c })} />
            ))}
          </div>
        </div>

        <div className="form-group">
          <Label right={`${currentStyle.fontSize}px`}>Tamaño Letra</Label>
          <input type="range" className="range-slider" min="24" max="140" value={currentStyle.fontSize} onChange={(e) => updateStyle({ fontSize: parseInt(e.target.value) })} />
        </div>

        <div className="form-group">
          <Label right={currentStyle.lineHeight}>Interlineado</Label>
          <input type="range" className="range-slider" min="1" max="2.2" step="0.1" value={currentStyle.lineHeight} onChange={(e) => updateStyle({ lineHeight: parseFloat(e.target.value) })} />
        </div>

        <div className="form-group">
          <Label>Alineación del Texto</Label>
          <div className="align-group">
            {(['left','center','right','justify'] as const).map((a) => (
              <button key={a} className={`align-btn ${currentStyle.textAlign === a ? 'active' : ''}`} onClick={() => updateStyle({ textAlign: a })}>
                {a === 'left' ? <AlignLeft size={16}/> : a === 'center' ? <AlignCenter size={16}/> : a === 'right' ? <AlignRight size={16}/> : <AlignJustify size={16}/>}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <Label>Posición del Bloque de Texto</Label>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className="position-grid">
              {alignmentOptions.map((opt, idx) => {
                const isActive = currentStyle.verticalAlign === opt.v && currentStyle.horizontalAlign === opt.h;
                return (
                  <button key={idx} className={`position-btn ${isActive ? 'active' : ''}`}
                    onClick={() => updateStyle({ verticalAlign: opt.v as any, horizontalAlign: opt.h as any })} title={opt.title}>
                    <div className="position-btn-dot" />
                  </button>
                );
              })}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <Label right={`${currentStyle.paddingX}%`}><span style={{ fontSize: '10px' }}>Margen Lateral</span></Label>
                <input type="range" className="range-slider" min="2" max="35" value={currentStyle.paddingX} onChange={(e) => updateStyle({ paddingX: parseInt(e.target.value) })} />
              </div>
              <div>
                <Label right={`${currentStyle.paddingY}%`}><span style={{ fontSize: '10px' }}>Margen Vertical</span></Label>
                <input type="range" className="range-slider" min="2" max="30" value={currentStyle.paddingY} onChange={(e) => updateStyle({ paddingY: parseInt(e.target.value) })} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Text Shadow ── */}
        <div className="form-group" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <div className="toggle-switch-container">
            <span className="form-label">Sombra de Texto</span>
            <Toggle checked={currentStyle.textShadow} onChange={(v) => updateStyle({ textShadow: v })} />
          </div>
          {currentStyle.textShadow && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ flex: 1 }}>
                <Label right={`${currentStyle.textShadowBlur}px`}><span style={{ fontSize: '10px' }}>Difuminado</span></Label>
                <input type="range" className="range-slider" min="1" max="20" value={currentStyle.textShadowBlur} onChange={(e) => updateStyle({ textShadowBlur: parseInt(e.target.value) })} />
              </div>
              <input type="color" value={currentStyle.textShadowColor} onChange={(e) => updateStyle({ textShadowColor: e.target.value })}
                style={{ width: '32px', height: '32px', cursor: 'pointer', border: 'none', borderRadius: '4px' }} />
            </div>
          )}
        </div>

        {/* ── Slide shadow effects ── */}
        <div className="form-group" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <Label>Efectos de Sombra de Diapositiva</Label>

          {/* Vignette */}
          <div style={{ marginTop: '8px' }}>
            <Label right={currentStyle.vignetteOpacity > 0 ? `${Math.round(currentStyle.vignetteOpacity * 100)}%` : 'Off'}>
              <span style={{ fontSize: '10px' }}>Viñeta (bordes oscuros)</span>
            </Label>
            <input type="range" className="range-slider" min="0" max="1" step="0.05"
              value={currentStyle.vignetteOpacity}
              onChange={(e) => updateStyle({ vignetteOpacity: parseFloat(e.target.value) })} />
          </div>

          {/* Inner shadow */}
          <div className="toggle-switch-container" style={{ marginTop: '10px' }}>
            <span className="form-label" style={{ fontSize: '10px', textTransform: 'none' }}>Sombra Interior (bordes)</span>
            <Toggle checked={currentStyle.innerShadow} onChange={(v) => updateStyle({ innerShadow: v })} />
          </div>
        </div>

        {/* ── Background ── */}
        <div className="form-group" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <Label>Fondo de Diapositiva</Label>
          <div className="tabs-header" style={{ marginBottom: '10px' }}>
            {(['solid','gradient','image'] as const).map((t) => (
              <button key={t} className={`tab-btn ${currentStyle.backgroundType === t ? 'active' : ''}`} onClick={() => updateStyle({ backgroundType: t })}>
                {t === 'solid' ? 'Sólido' : t === 'gradient' ? 'Degradado' : 'Imagen'}
              </button>
            ))}
          </div>

          {/* Solid */}
          {currentStyle.backgroundType === 'solid' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="color" value={currentStyle.backgroundColor} onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                style={{ width: '40px', height: '40px', cursor: 'pointer', border: '1px solid var(--border-subtle)', borderRadius: '8px', backgroundColor: 'transparent' }} />
              <input type="text" className="form-input" style={{ flex: 1 }} value={currentStyle.backgroundColor}
                onChange={(e) => updateStyle({ backgroundColor: e.target.value })} />
            </div>
          )}

          {/* Gradient */}
          {currentStyle.backgroundType === 'gradient' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="preset-grid">
                {PRESET_GRADIENTS.map((g, idx) => (
                  <button key={idx} className={`preset-card ${currentStyle.backgroundGradient === g.value ? 'active' : ''}`}
                    style={{ background: g.value, height: '40px', border: 'none', color: '#fff', fontSize: '10px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                    onClick={() => updateStyle({ backgroundGradient: g.value })}>
                    {currentStyle.backgroundGradient === g.value && <Check size={12} style={{ marginRight: '4px' }} />}
                    {g.name}
                  </button>
                ))}
              </div>
              <textarea className="form-textarea" style={{ minHeight: '60px', fontSize: '12px' }}
                value={currentStyle.backgroundGradient}
                onChange={(e) => updateStyle({ backgroundGradient: e.target.value })}
                placeholder="linear-gradient(...)" />
            </div>
          )}

          {/* Image */}
          {currentStyle.backgroundType === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="preset-grid">
                {PRESET_IMAGES.map((img, idx) => (
                  <button key={idx} className={`preset-card ${currentStyle.backgroundImage === img.value ? 'active' : ''}`}
                    style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)),url(${img.value})`, backgroundSize: 'cover', backgroundPosition: 'center', height: '40px', border: 'none', color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                    onClick={() => updateStyle({ backgroundImage: img.value })}>
                    {currentStyle.backgroundImage === img.value && <Check size={10} style={{ marginRight: '2px' }} />}
                    {img.name}
                  </button>
                ))}
              </div>

              <input type="text" className="form-input" placeholder="Pegar URL de imagen..."
                value={currentStyle.backgroundImage.startsWith('data:') ? '' : currentStyle.backgroundImage}
                onChange={(e) => updateStyle({ backgroundImage: e.target.value })} />

              <button className="btn btn-secondary" style={{ fontSize: '12px' }} onClick={() => fileInputRef.current?.click()}>
                <ImageIcon size={14} /> Subir imagen (JPG / PNG)
              </button>
              <input type="file" ref={fileInputRef} accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={handleImageUpload} style={{ display: 'none' }} />

              {/* Position & Size */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <Label><span style={{ fontSize: '10px' }}>Posición</span></Label>
                  <select className="form-select" value={currentStyle.bgPosition} onChange={(e) => updateStyle({ bgPosition: e.target.value as any })}>
                    {(['center','top','bottom','left','right'] as const).map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label><span style={{ fontSize: '10px' }}>Escala</span></Label>
                  <select className="form-select" value={currentStyle.bgSize} onChange={(e) => updateStyle({ bgSize: e.target.value as any })}>
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
              </div>

              {/* Blur */}
              <div>
                <Label right={currentStyle.bgBlur > 0 ? `${currentStyle.bgBlur}px` : 'Off'}><span style={{ fontSize: '10px' }}>Desenfoque de fondo</span></Label>
                <input type="range" className="range-slider" min="0" max="20" step="1" value={currentStyle.bgBlur} onChange={(e) => updateStyle({ bgBlur: parseInt(e.target.value) })} />
              </div>

              {/* Flat overlay */}
              <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <Label right={`${Math.round(currentStyle.overlayOpacity * 100)}%`}><span style={{ fontSize: '10px' }}>Capa oscura</span></Label>
                    <input type="range" className="range-slider" min="0" max="1" step="0.05" value={currentStyle.overlayOpacity} onChange={(e) => updateStyle({ overlayOpacity: parseFloat(e.target.value) })} />
                  </div>
                  <input type="color" value={currentStyle.overlayColor} onChange={(e) => updateStyle({ overlayColor: e.target.value })}
                    style={{ width: '28px', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }} />
                </div>

                {/* Gradient overlay */}
                <div className="toggle-switch-container" style={{ marginTop: '8px' }}>
                  <span className="form-label" style={{ fontSize: '10px', textTransform: 'none' }}>Degradado de sombra</span>
                  <Toggle checked={currentStyle.overlayGradient} onChange={(v) => updateStyle({ overlayGradient: v })} />
                </div>
                {currentStyle.overlayGradient && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {OVERLAY_GRADIENTS.map((og, i) => (
                        <button key={i} className={`btn btn-secondary ${currentStyle.overlayGradientValue === og.value ? 'active' : ''}`}
                          style={{ fontSize: '10px', padding: '3px 8px' }}
                          onClick={() => updateStyle({ overlayGradientValue: og.value })}>
                          {og.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Bible reference style ── */}
        <div className="form-group" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <Label>Estilo de Cita Bíblica</Label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
            <select className="form-select" style={{ flex: 1 }} value={currentStyle.refPosition} onChange={(e) => updateStyle({ refPosition: e.target.value as any })}>
              <option value="bottom">Posición: Abajo</option>
              <option value="top">Posición: Arriba</option>
            </select>
            <input type="color" value={currentStyle.refColor} onChange={(e) => updateStyle({ refColor: e.target.value })}
              style={{ width: '36px', height: '36px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-deep)' }} title="Color de Cita" />
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '6px' }}>
            <div style={{ flex: 1 }}>
              <Label right={`${currentStyle.refFontSize}px`}><span style={{ fontSize: '10px' }}>Tamaño Cita</span></Label>
              <input type="range" className="range-slider" min="16" max="80" value={currentStyle.refFontSize} onChange={(e) => updateStyle({ refFontSize: parseInt(e.target.value) })} />
            </div>
            <div className="toggle-switch-container" style={{ minWidth: '80px', gap: '8px' }}>
              <span className="form-label" style={{ fontSize: '10px', textTransform: 'none' }}>Itálica</span>
              <Toggle checked={currentStyle.refItalic} onChange={(v) => updateStyle({ refItalic: v })} />
            </div>
          </div>
        </div>

        {/* ── Export ── */}
        <div className="form-group" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginBottom: '20px' }}>
          <Label>Exportar Presentación</Label>
          <div className="export-grid">
            <button className="export-btn" onClick={onExportCurrentJpg} disabled={isExporting || !activeSlide} title="JPG de la diapositiva actual">
              <FileImage size={20} />JPG Actual
            </button>
            <button className="export-btn" onClick={onExportAllJpg} disabled={isExporting || !activeSlide} title="Todas las diapositivas en ZIP">
              <Download size={20} />ZIP Imágenes
            </button>
            <button className="export-btn" onClick={onExportPdf} disabled={isExporting || !activeSlide} title="PDF con todas las diapositivas">
              <FileText size={20} />Exportar PDF
            </button>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} onClick={onExportPptx} disabled={isExporting || !activeSlide}>
            <Presentation size={16} />Exportar a PowerPoint (.pptx)
          </button>
        </div>

      </div>

      {isExporting && (
        <div className="loading-overlay">
          <div className="spinner" />
          <div style={{ fontSize: '14px', fontWeight: '600', letterSpacing: '0.5px' }}>
            {exportProgress || 'Procesando exportación...'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Por favor, no cierres la ventana.</div>
        </div>
      )}
    </div>
  );
};
