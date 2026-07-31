import React, { useRef } from 'react';
import type { Slide, SlideStyle } from '../types';
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Bold, 
  Italic, 
  Type, 
  Image as ImageIcon, 
  Download, 
  Layers, 
  Globe, 
  Sliders, 
  FileText, 
  FileImage,
  Presentation,
  Check
} from 'lucide-react';

interface EditorPanelProps {
  activeSlide: Slide | null;
  globalStyle: SlideStyle;
  onChangeGlobalStyle: (style: SlideStyle) => void;
  onChangeSlideStyle: (style: Partial<SlideStyle> | undefined) => void;
  onApplyStyleToAll: () => void;
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
  { name: 'System Default', value: "system-ui, sans-serif" },
];

const PRESET_COLORS = [
  '#ffffff', // Pure White
  '#f3f4f6', // Soft White
  '#fde047', // Bible Gold
  '#a7f3d0', // Mint Green
  '#bfdbfe', // Soft Blue
  '#fbcfe8', // Soft Pink
  '#fed7aa', // Light Orange
  '#c084fc', // Lilac
];

const PRESET_GRADIENTS = [
  { name: 'Midnight Purple', value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)' },
  { name: 'Warm Ember', value: 'linear-gradient(135deg, #180808 0%, #280f08 50%, #3b1008 100%)' },
  { name: 'Deep Sea', value: 'linear-gradient(135deg, #020617 0%, #071e3d 60%, #0d346c 100%)' },
  { name: 'Slate Gray', value: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' },
  { name: 'Forest Shadow', value: 'linear-gradient(135deg, #050b0a 0%, #0d1e1c 60%, #16302b 100%)' },
  { name: 'Burgundy Wine', value: 'linear-gradient(135deg, #110307 0%, #27060f 60%, #3e0c1b 100%)' },
];

const PRESET_IMAGES = [
  { name: 'Cielo Estrellado', value: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=1920' },
  { name: 'Textura Grunge Oscura', value: 'https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?q=80&w=1920' },
  { name: 'Montaña Silenciosa', value: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1920' },
  { name: 'Cruces abstractas', value: 'https://images.unsplash.com/photo-1544427928-14206c4a30e6?q=80&w=1920' },
];

export const EditorPanel: React.FC<EditorPanelProps> = ({
  activeSlide,
  globalStyle,
  onChangeGlobalStyle,
  onChangeSlideStyle,
  onApplyStyleToAll,
  onExportCurrentJpg,
  onExportAllJpg,
  onExportPdf,
  onExportPptx,
  isExporting,
  exportProgress
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if we are editing slide-specific override or global style
  const isEditingLocal = activeSlide !== null && activeSlide.customStyle !== undefined;
  
  const currentStyle: SlideStyle = activeSlide && activeSlide.customStyle 
    ? { ...globalStyle, ...activeSlide.customStyle }
    : globalStyle;

  const updateStyle = (newFields: Partial<SlideStyle>) => {
    if (isEditingLocal) {
      onChangeSlideStyle(newFields);
    } else {
      onChangeGlobalStyle({ ...globalStyle, ...newFields });
    }
  };

  const handleToggleScope = (scope: 'global' | 'local') => {
    if (!activeSlide) return;
    if (scope === 'local') {
      // Initialize local override with copy of current global
      onChangeSlideStyle({});
    } else {
      // Remove local override — pass undefined to signal removal in parent
      onChangeSlideStyle(undefined);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          updateStyle({ 
            backgroundType: 'image',
            backgroundImage: reader.result 
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Alignments grid setup (3x3 mapping)
  const alignmentOptions = [
    { v: 'flex-start', h: 'flex-start', title: 'Arriba Izquierda' },
    { v: 'flex-start', h: 'center', title: 'Arriba Centro' },
    { v: 'flex-start', h: 'flex-end', title: 'Arriba Derecha' },
    { v: 'center', h: 'flex-start', title: 'Centro Izquierda' },
    { v: 'center', h: 'center', title: 'Centro Centro' },
    { v: 'center', h: 'flex-end', title: 'Centro Derecha' },
    { v: 'flex-end', h: 'flex-start', title: 'Abajo Izquierda' },
    { v: 'flex-end', h: 'center', title: 'Abajo Centro' },
    { v: 'flex-end', h: 'flex-end', title: 'Abajo Derecha' },
  ];

  return (
    <div className="panel right">
      <div className="panel-header">
        <h2 className="panel-title">
          <Sliders size={18} />
          Estilos y Diseño
        </h2>
      </div>

      <div className="panel-content">
        {/* Style Scope Switcher */}
        {activeSlide && (
          <div className="form-group">
            <span className="form-label">Ámbito de Edición</span>
            <div className="tabs-header">
              <button 
                className={`tab-btn ${!isEditingLocal ? 'active' : ''}`}
                onClick={() => handleToggleScope('global')}
              >
                <Globe size={14} />
                Global
              </button>
              <button 
                className={`tab-btn ${isEditingLocal ? 'active' : ''}`}
                onClick={() => handleToggleScope('local')}
              >
                <Layers size={14} />
                Solo Esta
              </button>
            </div>
            {isEditingLocal && (
              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '11px', padding: '6px' }}
                onClick={onApplyStyleToAll}
              >
                Aplicar este estilo a todas las diapositivas
              </button>
            )}
          </div>
        )}

        {/* Font Family */}
        <div className="form-group">
          <span className="form-label">Tipografía</span>
          <select 
            className="form-select"
            value={currentStyle.fontFamily}
            onChange={(e) => updateStyle({ fontFamily: e.target.value })}
          >
            {FONTS.map(f => (
              <option key={f.value} value={f.value}>{f.name}</option>
            ))}
          </select>
        </div>

        {/* Text Style: Bold, Italic, Capitalization, Color */}
        <div className="form-group">
          <span className="form-label">Formato de Texto</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div className="align-group" style={{ flex: 1 }}>
              <button 
                className={`align-btn ${currentStyle.bold ? 'active' : ''}`}
                onClick={() => updateStyle({ bold: !currentStyle.bold })}
                title="Negrita"
              >
                <Bold size={16} />
              </button>
              <button 
                className={`align-btn ${currentStyle.italic ? 'active' : ''}`}
                onClick={() => updateStyle({ italic: !currentStyle.italic })}
                title="Cursiva"
              >
                <Italic size={16} />
              </button>
              <button 
                className={`align-btn ${currentStyle.uppercase ? 'active' : ''}`}
                onClick={() => updateStyle({ uppercase: !currentStyle.uppercase })}
                title="Mayúsculas"
              >
                <Type size={16} />
              </button>
            </div>
            <input 
              type="color" 
              value={currentStyle.color.startsWith('#') ? currentStyle.color : '#ffffff'} 
              onChange={(e) => updateStyle({ color: e.target.value })}
              style={{ width: '36px', height: '36px', padding: '2px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-deep)' }}
              title="Color de Texto"
            />
          </div>
          
          <div className="color-picker-row" style={{ marginTop: '4px' }}>
            {PRESET_COLORS.map(c => (
              <div 
                key={c} 
                className={`color-swatch ${currentStyle.color.toLowerCase() === c.toLowerCase() ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => updateStyle({ color: c })}
              />
            ))}
          </div>
        </div>

        {/* Font Size & Line Height */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="form-label">Tamaño Letra</span>
            <span className="range-value">{currentStyle.fontSize}px</span>
          </div>
          <div className="range-slider-container">
            <input 
              type="range" 
              className="range-slider"
              min="24" 
              max="140" 
              value={currentStyle.fontSize}
              onChange={(e) => updateStyle({ fontSize: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="form-label">Interlineado</span>
            <span className="range-value">{currentStyle.lineHeight}</span>
          </div>
          <div className="range-slider-container">
            <input 
              type="range" 
              className="range-slider"
              min="1" 
              max="2.2" 
              step="0.1"
              value={currentStyle.lineHeight}
              onChange={(e) => updateStyle({ lineHeight: parseFloat(e.target.value) })}
            />
          </div>
        </div>

        {/* Text Align & Layout Align */}
        <div className="form-group">
          <span className="form-label">Alineación del Texto</span>
          <div className="align-group">
            <button 
              className={`align-btn ${currentStyle.textAlign === 'left' ? 'active' : ''}`}
              onClick={() => updateStyle({ textAlign: 'left' })}
            >
              <AlignLeft size={16} />
            </button>
            <button 
              className={`align-btn ${currentStyle.textAlign === 'center' ? 'active' : ''}`}
              onClick={() => updateStyle({ textAlign: 'center' })}
            >
              <AlignCenter size={16} />
            </button>
            <button 
              className={`align-btn ${currentStyle.textAlign === 'right' ? 'active' : ''}`}
              onClick={() => updateStyle({ textAlign: 'right' })}
            >
              <AlignRight size={16} />
            </button>
            <button 
              className={`align-btn ${currentStyle.textAlign === 'justify' ? 'active' : ''}`}
              onClick={() => updateStyle({ textAlign: 'justify' })}
            >
              <AlignJustify size={16} />
            </button>
          </div>
        </div>

        {/* Flexbox Position Grid */}
        <div className="form-group">
          <span className="form-label">Posición del Bloque de Texto</span>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className="position-grid">
              {alignmentOptions.map((opt, idx) => {
                const isActive = currentStyle.verticalAlign === opt.v && currentStyle.horizontalAlign === opt.h;
                return (
                  <button
                    key={idx}
                    className={`position-btn ${isActive ? 'active' : ''}`}
                    onClick={() => updateStyle({ verticalAlign: opt.v as any, horizontalAlign: opt.h as any })}
                    title={opt.title}
                  >
                    <div className="position-btn-dot" />
                  </button>
                );
              })}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="form-label" style={{ fontSize: '10px' }}>Margen Lateral</span>
                  <span className="range-value" style={{ fontSize: '11px' }}>{currentStyle.paddingX}%</span>
                </div>
                <input 
                  type="range" 
                  className="range-slider"
                  min="2" 
                  max="35" 
                  value={currentStyle.paddingX}
                  onChange={(e) => updateStyle({ paddingX: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="form-label" style={{ fontSize: '10px' }}>Margen Vertical</span>
                  <span className="range-value" style={{ fontSize: '11px' }}>{currentStyle.paddingY}%</span>
                </div>
                <input 
                  type="range" 
                  className="range-slider"
                  min="2" 
                  max="30" 
                  value={currentStyle.paddingY}
                  onChange={(e) => updateStyle({ paddingY: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Text Shadow */}
        <div className="form-group" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <div className="toggle-switch-container">
            <span className="form-label">Sombra de Texto</span>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={currentStyle.textShadow}
                onChange={(e) => updateStyle({ textShadow: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          {currentStyle.textShadow && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="form-label" style={{ fontSize: '10px' }}>Difuminado</span>
                    <span className="range-value" style={{ fontSize: '11px' }}>{currentStyle.textShadowBlur}px</span>
                  </div>
                  <input 
                    type="range" 
                    className="range-slider"
                    min="1" 
                    max="15" 
                    value={currentStyle.textShadowBlur}
                    onChange={(e) => updateStyle({ textShadowBlur: parseInt(e.target.value) })}
                  />
                </div>
                <input 
                  type="color" 
                  value={currentStyle.textShadowColor} 
                  onChange={(e) => updateStyle({ textShadowColor: e.target.value })}
                  style={{ width: '32px', height: '32px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Background Config */}
        <div className="form-group" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <span className="form-label">Fondo de Diapositiva</span>
          <div className="tabs-header" style={{ marginBottom: '10px' }}>
            <button 
              className={`tab-btn ${currentStyle.backgroundType === 'solid' ? 'active' : ''}`}
              onClick={() => updateStyle({ backgroundType: 'solid' })}
            >
              Sólido
            </button>
            <button 
              className={`tab-btn ${currentStyle.backgroundType === 'gradient' ? 'active' : ''}`}
              onClick={() => updateStyle({ backgroundType: 'gradient' })}
            >
              Degradado
            </button>
            <button 
              className={`tab-btn ${currentStyle.backgroundType === 'image' ? 'active' : ''}`}
              onClick={() => updateStyle({ backgroundType: 'image' })}
            >
              Imagen
            </button>
          </div>

          {/* Solid BG */}
          {currentStyle.backgroundType === 'solid' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="color" 
                value={currentStyle.backgroundColor} 
                onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                style={{ width: '40px', height: '40px', cursor: 'pointer', border: '1px solid var(--border-subtle)', borderRadius: '8px', backgroundColor: 'transparent' }}
              />
              <input 
                type="text"
                className="form-input"
                style={{ flex: 1 }}
                value={currentStyle.backgroundColor}
                onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
              />
            </div>
          )}

          {/* Gradient BG */}
          {currentStyle.backgroundType === 'gradient' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="preset-grid">
                {PRESET_GRADIENTS.map((g, idx) => (
                  <button 
                    key={idx}
                    className={`preset-card ${currentStyle.backgroundGradient === g.value ? 'active' : ''}`}
                    style={{ background: g.value, height: '40px', border: 'none', color: '#fff', fontSize: '10px', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                    onClick={() => updateStyle({ backgroundGradient: g.value })}
                  >
                    {currentStyle.backgroundGradient === g.value && <Check size={12} style={{ marginRight: '4px' }} />}
                    {g.name}
                  </button>
                ))}
              </div>
              <textarea 
                className="form-textarea"
                style={{ minHeight: '60px', fontSize: '12px' }}
                value={currentStyle.backgroundGradient}
                onChange={(e) => updateStyle({ backgroundGradient: e.target.value })}
                placeholder="linear-gradient(...)"
              />
            </div>
          )}

          {/* Image BG */}
          {currentStyle.backgroundType === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Presets */}
              <div className="preset-grid">
                {PRESET_IMAGES.map((img, idx) => (
                  <button
                    key={idx}
                    className={`preset-card ${currentStyle.backgroundImage === img.value ? 'active' : ''}`}
                    style={{ 
                      backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${img.value})`, 
                      backgroundSize: 'cover', 
                      backgroundPosition: 'center',
                      height: '40px', 
                      border: 'none', 
                      color: '#fff', 
                      fontSize: '9px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                    }}
                    onClick={() => updateStyle({ backgroundImage: img.value })}
                  >
                    {currentStyle.backgroundImage === img.value && <Check size={10} style={{ marginRight: '2px' }} />}
                    {img.name}
                  </button>
                ))}
              </div>

              <input 
                type="text"
                className="form-input"
                placeholder="Pegar URL de imagen..."
                value={currentStyle.backgroundImage.startsWith('data:') ? '' : currentStyle.backgroundImage}
                onChange={(e) => updateStyle({ backgroundImage: e.target.value })}
              />

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, fontSize: '12px' }}
                  onClick={() => fileInputRef.current?.click()}
                  title="Subir una imagen en formato JPG o PNG para usar como fondo"
                >
                  <ImageIcon size={14} />
                  Subir Fondo (JPG / PNG)
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Overlay styling */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed var(--border-subtle)', paddingTop: '10px', marginTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="form-label" style={{ fontSize: '10px' }}>Opacidad Capa Oscura</span>
                  <span className="range-value" style={{ fontSize: '11px' }}>{Math.round(currentStyle.overlayOpacity * 100)}%</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="range" 
                    className="range-slider"
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={currentStyle.overlayOpacity}
                    onChange={(e) => updateStyle({ overlayOpacity: parseFloat(e.target.value) })}
                  />
                  <input 
                    type="color" 
                    value={currentStyle.overlayColor} 
                    onChange={(e) => updateStyle({ overlayColor: e.target.value })}
                    style={{ width: '28px', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bible Reference Styles (Bible Verse slide quote styling) */}
        <div className="form-group" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <span className="form-label">Estilo de Cita Bíblica (Referencia)</span>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
            <select 
              className="form-select"
              style={{ flex: 1 }}
              value={currentStyle.refPosition}
              onChange={(e) => updateStyle({ refPosition: e.target.value as any })}
            >
              <option value="bottom">Posición: Abajo</option>
              <option value="top">Posición: Arriba</option>
            </select>
            <input 
              type="color" 
              value={currentStyle.refColor} 
              onChange={(e) => updateStyle({ refColor: e.target.value })}
              style={{ width: '36px', height: '36px', cursor: 'pointer', borderRadius: '8px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-deep)' }}
              title="Color de Cita"
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '6px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="form-label" style={{ fontSize: '10px' }}>Tamaño Cita</span>
                <span className="range-value" style={{ fontSize: '11px' }}>{currentStyle.refFontSize}px</span>
              </div>
              <input 
                type="range" 
                className="range-slider"
                min="16" 
                max="80" 
                value={currentStyle.refFontSize}
                onChange={(e) => updateStyle({ refFontSize: parseInt(e.target.value) })}
              />
            </div>
            
            <label className="toggle-switch-container" style={{ minWidth: '80px', gap: '8px' }}>
              <span className="form-label" style={{ fontSize: '10px', textTransform: 'none' }}>Itálica</span>
              <label className="toggle-switch" style={{ scale: '0.8' }}>
                <input 
                  type="checkbox" 
                  checked={currentStyle.refItalic}
                  onChange={(e) => updateStyle({ refItalic: e.target.checked })}
                />
                <span className="toggle-slider" />
              </label>
            </label>
          </div>
        </div>

        {/* Export System */}
        <div className="form-group" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginBottom: '20px' }}>
          <span className="form-label">Exportar Presentación</span>
          
          <div className="export-grid">
            <button 
              className="export-btn"
              onClick={onExportCurrentJpg}
              disabled={isExporting || !activeSlide}
              title="Descargar la diapositiva seleccionada en formato JPG"
            >
              <FileImage size={20} />
              JPG Actual
            </button>
            <button 
              className="export-btn"
              onClick={onExportAllJpg}
              disabled={isExporting || !activeSlide}
              title="Descargar todas las diapositivas en un archivo ZIP de imágenes"
            >
              <Download size={20} />
              ZIP Imágenes
            </button>
            <button 
              className="export-btn"
              onClick={onExportPdf}
              disabled={isExporting || !activeSlide}
              title="Generar un documento PDF con una página por diapositiva"
            >
              <FileText size={20} />
              Exportar PDF
            </button>
          </div>

          <button 
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            onClick={onExportPptx}
            disabled={isExporting || !activeSlide}
          >
            <Presentation size={16} />
            Exportar a PowerPoint (.pptx)
          </button>
        </div>
      </div>

      {/* Loading Overlay when generating exports */}
      {isExporting && (
        <div className="loading-overlay">
          <div className="spinner" />
          <div style={{ fontSize: '14px', fontWeight: '600', letterSpacing: '0.5px' }}>
            {exportProgress || 'Procesando exportación...'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Por favor, no cierres la ventana.
          </div>
        </div>
      )}
    </div>
  );
};
