import { useState, useRef } from "react";

// ─── Preset color themes ──────────────────────────────────────────────────────
const SLIDE_TEMPLATES = [
  { id: "corporate", name: "Corporativo",  icon: "🏢", colors: { bg: "#0f172a", accent: "#3b82f6", text: "#f8fafc", sub: "#94a3b8" } },
  { id: "creative",  name: "Creativo",     icon: "🎨", colors: { bg: "#1a0533", accent: "#e040fb", text: "#ffffff",  sub: "#ce93d8" } },
  { id: "minimal",   name: "Minimalista",  icon: "◻",  colors: { bg: "#ffffff", accent: "#111827", text: "#111827", sub: "#6b7280" } },
  { id: "nature",    name: "Natural",      icon: "🌿", colors: { bg: "#052e16", accent: "#22c55e", text: "#f0fdf4", sub: "#86efac" } },
  { id: "sunset",    name: "Atardecer",    icon: "🌅", colors: { bg: "#431407", accent: "#f97316", text: "#fff7ed", sub: "#fed7aa" } },
  { id: "ocean",     name: "Océano",       icon: "🌊", colors: { bg: "#083344", accent: "#06b6d4", text: "#ecfeff", sub: "#a5f3fc" } },
];

const STEPS = ["template", "content", "result"];

// ─── Canvas helpers ───────────────────────────────────────────────────────────
function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (ctx.measureText(t).width > maxWidth && cur) { lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function renderSlideToCanvas(slide, template, index, total, bgImageDataUrl) {
  const W = 1280, H = 720;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const c = template.colors;

  // Draw bg image if provided, else solid color
  if (bgImageDataUrl) {
    const img = new Image();
    img.src = bgImageDataUrl;
    // Draw synchronously (already loaded at this point)
    ctx.drawImage(img, 0, 0, W, H);
    // Dark overlay so text is readable
    ctx.fillStyle = "rgba(0,0,0,0.52)";
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);
    // Radial glow
    const grd = ctx.createRadialGradient(W, 0, 0, W, 0, W * 0.75);
    grd.addColorStop(0, c.accent + "28");
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  }

  // Bottom stripe
  ctx.fillStyle = bgImageDataUrl ? "rgba(255,255,255,0.85)" : c.accent;
  ctx.fillRect(0, H - 6, W * 0.45, 6);
  ctx.fillStyle = bgImageDataUrl ? "rgba(255,255,255,0.3)" : c.accent + "33";
  ctx.fillRect(W * 0.45, H - 6, W * 0.55, 6);

  // Slide counter
  ctx.save();
  ctx.font = "600 20px monospace";
  ctx.fillStyle = bgImageDataUrl ? "rgba(255,255,255,0.55)" : c.sub + "70";
  ctx.textAlign = "left";
  ctx.fillText(`${String(index+1).padStart(2,"0")} / ${String(total).padStart(2,"0")}`, 64, 56);
  ctx.restore();

  // Template label top-right
  ctx.save();
  ctx.font = "500 16px monospace";
  ctx.fillStyle = bgImageDataUrl ? "rgba(255,255,255,0.45)" : c.accent + "80";
  ctx.textAlign = "right";
  ctx.fillText(template.name.toUpperCase(), W - 64, 56);
  ctx.restore();

  const textColor = bgImageDataUrl ? "#ffffff" : c.text;
  const subColor  = bgImageDataUrl ? "rgba(255,255,255,0.82)" : c.sub;
  const accentCol = bgImageDataUrl ? "#ffffff" : c.accent;

  const PAD = 130, CX = W / 2, CW = W - PAD * 2;
  const titleSize = slide.title.length > 55 ? 46 : slide.title.length > 35 ? 54 : 64;
  ctx.font = `bold ${titleSize}px Georgia, serif`;
  const titleLines = wrapText(ctx, slide.title, CW);
  const titleLineH = titleSize * 1.3;

  const rawLines = slide.content ? slide.content.split("\n").filter(l => l.trim()) : [];
  const bulletSize = 24;
  ctx.font = `${bulletSize}px 'Segoe UI', sans-serif`;
  const bulletRows = rawLines.flatMap(line => {
    const isBullet = line.startsWith("•");
    const clean = isBullet ? line.slice(1).trim() : line;
    return wrapText(ctx, clean, CW - 40).map((w, i) => ({ text: w, bullet: isBullet && i === 0, cont: isBullet && i > 0 }));
  });
  const bulletRowH = bulletSize * 1.7;
  const hasSubtitle = !!slide.subtitle;
  const blockH = titleLines.length * titleLineH + (hasSubtitle ? 56 : 0) + (bulletRows.length > 0 ? 46 + bulletRows.length * bulletRowH : 0);
  let y = H / 2 - blockH / 2 + titleSize;

  ctx.font = `bold ${titleSize}px Georgia, serif`;
  ctx.fillStyle = textColor; ctx.textAlign = "center";
  for (const line of titleLines) { ctx.fillText(line, CX, y); y += titleLineH; }

  if (hasSubtitle) {
    y += 14;
    ctx.font = "600 27px 'Segoe UI', sans-serif";
    ctx.fillStyle = accentCol; ctx.textAlign = "center";
    ctx.fillText(slide.subtitle, CX, y); y += 42;
  }

  if (bulletRows.length > 0) {
    y += 10;
    ctx.save(); ctx.strokeStyle = accentCol + "55"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(CX - 180, y); ctx.lineTo(CX + 180, y); ctx.stroke(); ctx.restore();
    y += 36;
  }

  for (const row of bulletRows) {
    ctx.font = `${bulletSize}px 'Segoe UI', sans-serif`; ctx.textAlign = "center";
    if (row.bullet) {
      const arrow = "▸";
      const arrowW = ctx.measureText(arrow + "  ").width;
      const totalW = ctx.measureText(arrow + "  " + row.text).width;
      const startX = CX - totalW / 2;
      ctx.fillStyle = accentCol; ctx.textAlign = "left"; ctx.fillText(arrow, startX, y);
      ctx.fillStyle = subColor; ctx.fillText("  " + row.text, startX + arrowW, y);
    } else {
      ctx.fillStyle = subColor; ctx.textAlign = "center"; ctx.fillText(row.text, CX, y);
    }
    y += bulletRowH;
  }
  return canvas;
}

// ─── Template card — LINE style ───────────────────────────────────────────────
function TemplateCard({ template, selected, onSelect }) {
  const c = template.colors;
  return (
    <button
      onClick={() => onSelect(template)}
      style={{
        border: `1.5px solid ${selected ? c.accent : "#334155"}`,
        background: "transparent",
        color: "#f8fafc",
        transition: "all 0.25s ease",
        boxShadow: selected ? `0 0 0 3px ${c.accent}40` : "none",
      }}
      className="rounded-xl px-4 py-3 text-left cursor-pointer relative flex items-center gap-4 hover:border-slate-400 w-full"
    >
      {/* Color swatch strip */}
      <div className="flex flex-col gap-1 flex-shrink-0">
        {[c.bg, c.accent, c.text, c.sub].map((color, i) => (
          <div key={i} style={{ width: 14, height: 14, borderRadius: 3, background: color, border: "1px solid rgba(255,255,255,0.12)" }} />
        ))}
      </div>

      {/* Name + icon */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base">{template.icon}</span>
          <span className="font-semibold text-sm text-white truncate">{template.name}</span>
        </div>
        {/* Mini accent line */}
        <div className="mt-1.5 h-0.5 rounded-full w-10" style={{ background: c.accent }} />
      </div>

      {/* Check */}
      {selected && (
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: c.accent, color: "#fff" }}>✓</div>
      )}
    </button>
  );
}

// ─── Slide visual preview ─────────────────────────────────────────────────────
function SlidePreview({ slide, template, index, total, bgImage }) {
  const c = template.colors;
  const lines = slide.content ? slide.content.split("\n").filter(l => l.trim()) : [];
  const isDark = bgImage || c.bg !== "#ffffff";
  const textCol = bgImage ? "#fff" : c.text;
  const subCol  = bgImage ? "rgba(255,255,255,0.82)" : c.sub;
  const accCol  = bgImage ? "#fff" : c.accent;

  return (
    <div
      className="rounded-xl overflow-hidden shadow-2xl relative"
      style={{
        background: bgImage ? "#000" : c.bg,
        border: `1.5px solid ${c.accent}30`,
        aspectRatio: "16/9",
        width: "100%",
      }}
    >
      {/* BG image */}
      {bgImage && (
        <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.48 }} />
      )}
      {/* Glow overlay (no bg image) */}
      {!bgImage && (
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 105% -5%, ${c.accent}22, transparent 55%)` }} />
      )}
      {/* Bottom stripe */}
      <div className="absolute bottom-0 left-0 right-0 flex" style={{ height: 5 }}>
        <div style={{ flex: "0 0 45%", background: bgImage ? "rgba(255,255,255,0.85)" : c.accent }} />
        <div style={{ flex: 1, background: bgImage ? "rgba(255,255,255,0.28)" : c.accent + "30" }} />
      </div>

      {/* Counter */}
      <div className="absolute top-3 left-4 font-mono text-xs" style={{ color: subCol, opacity: 0.5 }}>
        {String(index+1).padStart(2,"0")} / {String(total).padStart(2,"0")}
      </div>

      {/* Centered content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-10" style={{ paddingTop: 32, paddingBottom: 20 }}>
        <h2 style={{
          color: textCol, fontFamily: "Georgia, serif", fontWeight: 700,
          fontSize: slide.title.length > 55 ? "clamp(11px,2vw,20px)" : slide.title.length > 35 ? "clamp(13px,2.4vw,24px)" : "clamp(15px,2.9vw,29px)",
          lineHeight: 1.25, margin: 0,
        }}>{slide.title}</h2>

        {slide.subtitle && (
          <div style={{ color: accCol, fontWeight: 600, fontSize: "clamp(9px,1.3vw,13px)", marginTop: 8 }}>
            {slide.subtitle}
          </div>
        )}

        {lines.length > 0 && (
          <div style={{ width: "45%", height: 1.5, background: accCol + "45", margin: "10px auto" }} />
        )}

        {lines.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, maxWidth: "86%" }}>
            {lines.map((line, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 6,
                fontSize: "clamp(8px,1.1vw,11px)", lineHeight: 1.5, color: subCol, textAlign: "center" }}>
                {line.startsWith("•") ? (
                  <><span style={{ color: accCol, flexShrink: 0, marginTop: 1 }}>▸</span><span>{line.slice(1).trim()}</span></>
                ) : <span>{line}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ className = "w-5 h-5" }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  // Custom uploaded background image
  const [bgImage, setBgImage] = useState(null); // base64 dataURL
  const [bgFileName, setBgFileName] = useState("");
  const [text, setText] = useState("");
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [editingSlide, setEditingSlide] = useState(null);
  const uploadRef = useRef();
  const currentStep = STEPS[step];
  const tc = selectedTemplate?.colors || { bg: "#0f172a", accent: "#3b82f6", text: "#f8fafc", sub: "#94a3b8" };

  // ── Handle bg image upload ──
  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      // Preload into an Image so canvas drawImage works synchronously later
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => setBgImage(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function removeBgImage() { setBgImage(null); setBgFileName(""); if (uploadRef.current) uploadRef.current.value = ""; }

  // ── Generate slides ──
  async function generateSlides() {
    if (!text.trim() || !selectedTemplate) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Eres un experto en diseño de presentaciones. Analiza el texto y genera entre 4 y 7 diapositivas en el MISMO ORDEN del contenido original.

Texto:
"""
${text}
"""

Responde ÚNICAMENTE con JSON válido (sin markdown, sin backticks):
{
  "slides": [
    {
      "title": "Título corto e impactante (máx 10 palabras)",
      "subtitle": "Subtítulo breve (máx 6 palabras, puede ser vacío)",
      "content": "• Punto uno claro y directo\n• Punto dos\n• Punto tres"
    }
  ]
}

Reglas: 4-7 diapositivas en orden del texto. Primera diapositiva: título/intro. Bullets comienzan con •. Máx 4 bullets, cada uno máx 12 palabras. Si no hay subtítulo pon "".`,
          }],
        }),
      });
      const data = await res.json();
      const raw = (data.content || []).map(b => b.text || "").join("");
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setSlides(parsed.slides || []);
      setStep(2);
    } catch { setError("Error al generar las diapositivas. Verifica el texto e intenta de nuevo."); }
    finally { setLoading(false); }
  }

  // ── Download JPGs in order ──
  async function downloadAllJPGs() {
    if (!slides.length || !selectedTemplate || downloading) return;
    setDownloading(true); setDownloadProgress(0);
    await new Promise(r => setTimeout(r, 60));
    for (let i = 0; i < slides.length; i++) {
      const canvas = renderSlideToCanvas(slides[i], selectedTemplate, i, slides.length, bgImage);
      const url = canvas.toDataURL("image/jpeg", 0.95);
      const a = document.createElement("a");
      a.href = url; a.download = `diapositiva-${String(i+1).padStart(2,"0")}.jpg`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setDownloadProgress(i + 1);
      await new Promise(r => setTimeout(r, 380));
    }
    setDownloading(false); setDownloadProgress(0);
  }

  // ── Slide CRUD ──
  const updateSlide = (i, f, v) => setSlides(p => p.map((s, idx) => idx === i ? { ...s, [f]: v } : s));
  const addSlide = () => setSlides(p => [...p, { title: "Nueva diapositiva", subtitle: "", content: "• Contenido aquí\n• Segundo punto" }]);
  const removeSlide = (i) => { setSlides(p => p.filter((_, idx) => idx !== i)); if (editingSlide === i) setEditingSlide(null); };
  const moveSlide = (i, d) => {
    const ns = [...slides]; const t = i + d;
    if (t < 0 || t >= ns.length) return;
    [ns[i], ns[t]] = [ns[t], ns[i]]; setSlides(ns);
  };

  return (
    <div className="min-h-screen" style={{ background: "#060d1a", fontFamily: "'Segoe UI', sans-serif" }}>

      {/* ── HEADER ── */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-xl"
        style={{ background: "#060d1aee" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-base"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>▦</div>
          <span className="font-bold text-white text-lg tracking-tight">SlideRedactor</span>
        </div>
        <div className="flex items-center gap-1.5">
          {["Plantilla", "Contenido", "Resultado"].map((label, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <button onClick={() => { if (i <= step) setStep(i); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{ background: step===i?"#3b82f6":step>i?"#1e3a5f":"#1e293b", color: step>=i?"#fff":"#64748b", cursor: i<=step?"pointer":"default" }}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs" style={{ background:"#ffffff1a" }}>
                  {step > i ? "✓" : i+1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < 2 && <div className="w-5 h-px" style={{ background: step>i?"#3b82f6":"#334155" }} />}
            </div>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">

        {/* ══ STEP 1: Plantilla ══ */}
        {currentStep === "template" && (
          <div>
            <div className="text-center mb-10">
              <div className="inline-block text-xs font-mono tracking-widest text-blue-400 bg-blue-400/10 border border-blue-400/20 px-4 py-1.5 rounded-full mb-4">PASO 1 DE 3</div>
              <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Elige tu formato</h1>
              <p className="text-slate-400 text-lg max-w-md mx-auto">Sube tu propio fondo o elige una paleta de colores</p>
            </div>

            {/* ── Upload custom background ── */}
            <div className="mb-8">
              <h2 className="text-xs font-mono tracking-widest text-slate-400 uppercase mb-3 flex items-center gap-2">
                <span style={{ display:"inline-block", width:18, height:1, background:"#334155" }}/>
                Formato propio
                <span style={{ flex:1, height:1, background:"#334155" }}/>
              </h2>

              {!bgImage ? (
                <button
                  onClick={() => uploadRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-3 py-8 rounded-xl border-2 border-dashed border-slate-700 hover:border-blue-500 hover:bg-blue-500/5 transition-all text-slate-400 hover:text-white"
                >
                  <svg className="w-10 h-10 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="text-center">
                    <p className="font-semibold text-sm">Sube una imagen de fondo</p>
                    <p className="text-xs text-slate-500 mt-0.5">JPG, PNG o WEBP • Se usará como fondo de todas las diapositivas</p>
                  </div>
                  <span className="px-4 py-1.5 rounded-lg text-xs font-semibold text-blue-400 border border-blue-500/40 hover:bg-blue-500/10 transition-colors">
                    Seleccionar imagen
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-700 bg-slate-900/50">
                  <img src={bgImage} alt="bg" className="w-28 h-16 object-cover rounded-lg border border-slate-700 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{bgFileName}</p>
                    <p className="text-slate-500 text-xs mt-0.5">Imagen de fondo cargada ✓</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => uploadRef.current?.click()}
                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
                      Cambiar
                    </button>
                    <button onClick={removeBgImage}
                      className="px-3 py-1.5 text-xs rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                      Quitar
                    </button>
                  </div>
                </div>
              )}

              <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            {/* ── Color themes ── */}
            <div className="mb-8">
              <h2 className="text-xs font-mono tracking-widest text-slate-400 uppercase mb-3 flex items-center gap-2">
                <span style={{ display:"inline-block", width:18, height:1, background:"#334155" }}/>
                Paletas de color
                <span style={{ flex:1, height:1, background:"#334155" }}/>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {SLIDE_TEMPLATES.map(tmpl => (
                  <TemplateCard key={tmpl.id} template={tmpl} selected={selectedTemplate?.id === tmpl.id} onSelect={(t) => { setSelectedTemplate(t); }} />
                ))}
              </div>
            </div>

            {/* Preview of chosen bg */}
            {bgImage && selectedTemplate && (
              <div className="mb-6">
                <p className="text-xs text-slate-500 mb-2 font-mono">Vista previa de fondo + paleta:</p>
                <div className="rounded-xl overflow-hidden border border-slate-700" style={{ maxWidth: 380, aspectRatio:"16/9", position:"relative" }}>
                  <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity:0.48 }} />
                  <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: selectedTemplate.colors.accent }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-lg" style={{ fontFamily:"Georgia,serif", textShadow:"0 2px 8px rgba(0,0,0,0.7)" }}>
                      Vista previa
                    </span>
                  </div>
                </div>
              </div>
            )}

            {selectedTemplate && (
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-5">
                  <span className="text-green-400 mr-1">✓</span>
                  Paleta <strong className="text-white">{selectedTemplate.name}</strong>
                  {bgImage && <> · <span className="text-blue-400">con imagen de fondo</span></>}
                </p>
                <button onClick={() => setStep(1)}
                  className="px-8 py-3.5 rounded-xl font-semibold text-white text-lg transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
                  Continuar con el contenido →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ STEP 2: Contenido ══ */}
        {currentStep === "content" && (
          <div>
            <div className="text-center mb-10">
              <div className="inline-block text-xs font-mono tracking-widest text-purple-400 bg-purple-400/10 border border-purple-400/20 px-4 py-1.5 rounded-full mb-4">PASO 2 DE 3</div>
              <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Pega tu contenido</h1>
              <p className="text-slate-400 text-lg max-w-md mx-auto">
                La IA organizará tu texto en diapositivas con estilo <strong className="text-white">{selectedTemplate?.name}</strong>
              </p>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-700" style={{ background: "#0f1929" }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <span className="text-slate-500 text-xs ml-2 font-mono">contenido.txt</span>
                <span className="ml-auto text-xs text-slate-600 font-mono">
                  {text.length} chars · {text.trim().split(/\s+/).filter(Boolean).length} palabras
                </span>
              </div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={"Pega o escribe aquí el texto que quieres convertir en diapositivas...\n\nEjemplo:\nLa inteligencia artificial está transformando la educación. Los sistemas adaptativos personalizan el aprendizaje para cada estudiante..."}
                className="w-full bg-transparent text-slate-200 placeholder-slate-600 resize-none outline-none px-6 py-5 font-mono text-sm leading-relaxed"
                style={{ minHeight: 320, caretColor: "#3b82f6" }}
              />
            </div>

            {error && (
              <div className="mt-4 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex gap-2">
                <span>⚠</span> {error}
              </div>
            )}

            <div className="flex justify-between items-center mt-6">
              <button onClick={() => setStep(0)}
                className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all text-sm">
                ← Cambiar formato
              </button>
              <button onClick={generateSlides} disabled={!text.trim() || loading}
                className="px-8 py-3.5 rounded-xl font-semibold text-white text-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center gap-3"
                style={{ background: loading ? "#334155" : "linear-gradient(135deg, #8b5cf6, #3b82f6)" }}>
                {loading ? <><Spinner /> Generando diapositivas...</> : "✦ Generar diapositivas"}
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 3: Resultado ══ */}
        {currentStep === "result" && (
          <div>
            <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
              <div>
                <div className="inline-block text-xs font-mono tracking-widest text-green-400 bg-green-400/10 border border-green-400/20 px-4 py-1.5 rounded-full mb-3">
                  {slides.length} DIAPOSITIVAS • EN ORDEN
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Tu presentación está lista</h1>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <button onClick={() => { setStep(1); setSlides([]); }}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all text-sm">
                  ↺ Regenerar
                </button>
                <button onClick={addSlide}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105"
                  style={{ border:`1px solid ${tc.accent}50`, color: tc.accent, background:`${tc.accent}12` }}>
                  + Diapositiva
                </button>
                <button onClick={downloadAllJPGs} disabled={downloading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-wait disabled:scale-100"
                  style={{ background: downloading ? "#1e4035" : "linear-gradient(135deg, #10b981, #059669)" }}>
                  {downloading
                    ? <><Spinner className="w-4 h-4" />{downloadProgress}/{slides.length} descargando...</>
                    : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>Descargar JPG ({slides.length})</>
                  }
                </button>
              </div>
            </div>

            {downloading && (
              <div className="mb-6 rounded-xl overflow-hidden border border-green-500/20 bg-green-500/5">
                <div className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <span className="text-green-400 font-medium flex items-center gap-2"><Spinner className="w-4 h-4" />Guardando en orden...</span>
                  <span className="text-green-300 font-mono text-xs">diapositiva-{String(downloadProgress).padStart(2,"0")}.jpg</span>
                </div>
                <div className="h-1.5 bg-slate-800/80">
                  <div className="h-full transition-all duration-300 ease-out"
                    style={{ width:`${(downloadProgress/slides.length)*100}%`, background:"linear-gradient(90deg,#10b981,#06b6d4)" }} />
                </div>
              </div>
            )}

            {/* Info strip */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-700 bg-slate-900/50 mb-7 text-sm">
              {bgImage
                ? <img src={bgImage} alt="" className="w-12 h-7 object-cover rounded border border-slate-700 flex-shrink-0" />
                : <span className="text-lg">{selectedTemplate?.icon}</span>}
              <span className="text-slate-400">Formato:</span>
              <span className="text-white font-semibold">{selectedTemplate?.name}</span>
              {bgImage && <span className="text-blue-400 text-xs">+ imagen propia</span>}
              <div className="flex gap-1 ml-1">
                {[tc.bg, tc.accent, tc.text, tc.sub].map((c, i) => (
                  <div key={i} className="w-4 h-4 rounded-full border border-white/10" style={{ background: c }} />
                ))}
              </div>
              <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
                <span>JPG 1280×720px</span>
                <button onClick={() => setStep(0)} className="text-blue-400 hover:text-blue-300 transition-colors">Cambiar</button>
              </div>
            </div>

            {/* Slides grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
              {slides.map((slide, index) => (
                <div key={index} className="group relative">
                  <div className="flex items-center justify-between mb-2 px-0.5">
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-md" style={{ color: tc.accent, background: tc.accent+"18" }}>
                      #{String(index+1).padStart(2,"0")}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      {[
                        { l:"↑", a:()=>moveSlide(index,-1), d:index===0,             cls:"hover:text-white hover:bg-slate-700" },
                        { l:"↓", a:()=>moveSlide(index,1),  d:index===slides.length-1, cls:"hover:text-white hover:bg-slate-700" },
                        { l:"✏", a:()=>setEditingSlide(editingSlide===index?null:index), cls:"hover:text-blue-400 hover:bg-blue-400/10" },
                        { l:"✕", a:()=>removeSlide(index),  cls:"hover:text-red-400 hover:bg-red-400/10" },
                      ].map((btn,bi) => (
                        <button key={bi} onClick={btn.a} disabled={btn.d}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs text-slate-400 transition-all disabled:opacity-20 ${btn.cls}`}>
                          {btn.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <SlidePreview slide={slide} template={selectedTemplate} index={index} total={slides.length} bgImage={bgImage} />

                  {editingSlide === index && (
                    <div className="mt-3 p-4 rounded-xl border border-slate-600 bg-slate-900 space-y-3">
                      {[
                        { label:"Título",    field:"title",    ph:"Título de la diapositiva" },
                        { label:"Subtítulo", field:"subtitle", ph:"Subtítulo breve (opcional)" },
                      ].map(({ label, field, ph }) => (
                        <div key={field}>
                          <label className="text-xs text-slate-500 block mb-1">{label}</label>
                          <input className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
                            placeholder={ph} value={slide[field]||""} onChange={e=>updateSlide(index,field,e.target.value)} />
                        </div>
                      ))}
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Contenido <span className="opacity-50">(usa • para bullets)</span></label>
                        <textarea className="w-full bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors resize-none font-mono"
                          placeholder={"• Punto uno\n• Punto dos\n• Punto tres"} rows={5}
                          value={slide.content||""} onChange={e=>updateSlide(index,"content",e.target.value)} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={()=>setEditingSlide(null)}
                          className="px-4 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white border border-slate-700 transition-colors">Cerrar</button>
                        <button onClick={()=>setEditingSlide(null)}
                          className="px-4 py-1.5 rounded-lg text-sm text-white font-semibold"
                          style={{ background:"linear-gradient(135deg,#3b82f6,#8b5cf6)" }}>✓ Guardar</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-14 flex flex-col items-center gap-3">
              <p className="text-slate-600 text-xs font-mono">Los JPG se numeran en orden: diapositiva-01.jpg, diapositiva-02.jpg…</p>
              <button onClick={()=>{ setStep(0);setSlides([]);setText("");setSelectedTemplate(null);setEditingSlide(null); }}
                className="px-6 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all text-sm">
                ← Nueva presentación
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
