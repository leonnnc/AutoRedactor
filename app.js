// app.js placeholder
// ─── Configuración API ────────────────────────────────────────────────────────
// Pon tu API key de Anthropic aquí (nunca la subas a un repositorio público)
const API_KEY = '';

// ─── Datos ────────────────────────────────────────────────────────────────────
const SLIDE_TEMPLATES = [
  { id:'corporate', name:'Corporativo', icon:'🏢', colors:{bg:'#0f172a',accent:'#3b82f6',text:'#f8fafc',sub:'#94a3b8'} },
  { id:'creative',  name:'Creativo',    icon:'🎨', colors:{bg:'#1a0533',accent:'#e040fb',text:'#ffffff', sub:'#ce93d8'} },
  { id:'minimal',   name:'Minimalista', icon:'◻',  colors:{bg:'#ffffff',accent:'#111827',text:'#111827',sub:'#6b7280'} },
  { id:'nature',    name:'Natural',     icon:'🌿', colors:{bg:'#052e16',accent:'#22c55e',text:'#f0fdf4',sub:'#86efac'} },
  { id:'sunset',    name:'Atardecer',   icon:'🌅', colors:{bg:'#431407',accent:'#f97316',text:'#fff7ed',sub:'#fed7aa'} },
  { id:'ocean',     name:'Océano',      icon:'🌊', colors:{bg:'#083344',accent:'#06b6d4',text:'#ecfeff',sub:'#a5f3fc'} },
];

// ─── Estado ───────────────────────────────────────────────────────────────────
const state = {
  step: 0,
  selectedTemplate: null,
  bgImage: null,
  bgFileName: '',
  slides: [],
  loading: false,
  downloading: false,
  downloadProgress: 0,
  editingIndex: null,
};

// ─── Canvas helpers ───────────────────────────────────────────────────────────
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxWidth && cur) { lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function renderSlideToCanvas(slide, template, index, total, bgImageDataUrl) {
  return new Promise(resolve => {
    const W = 1280, H = 720;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const c = template.colors;

    function draw(bgImg) {
      if (bgImg) {
        ctx.drawImage(bgImg, 0, 0, W, H);
        ctx.fillStyle = 'rgba(0,0,0,0.52)';
        ctx.fillRect(0, 0, W, H);
      } else {
        ctx.fillStyle = c.bg;
        ctx.fillRect(0, 0, W, H);
        const grd = ctx.createRadialGradient(W, 0, 0, W, 0, W * 0.75);
        grd.addColorStop(0, c.accent + '28');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.fillStyle = bgImg ? 'rgba(255,255,255,0.85)' : c.accent;
      ctx.fillRect(0, H - 6, W * 0.45, 6);
      ctx.fillStyle = bgImg ? 'rgba(255,255,255,0.3)' : c.accent + '33';
      ctx.fillRect(W * 0.45, H - 6, W * 0.55, 6);

      ctx.save();
      ctx.font = '600 20px monospace';
      ctx.fillStyle = bgImg ? 'rgba(255,255,255,0.55)' : c.sub + '70';
      ctx.textAlign = 'left';
      ctx.fillText(`${String(index+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}`, 64, 56);
      ctx.restore();

      ctx.save();
      ctx.font = '500 16px monospace';
      ctx.fillStyle = bgImg ? 'rgba(255,255,255,0.45)' : c.accent + '80';
      ctx.textAlign = 'right';
      ctx.fillText(template.name.toUpperCase(), W - 64, 56);
      ctx.restore();

      const textColor = bgImg ? '#ffffff' : c.text;
      const subColor  = bgImg ? 'rgba(255,255,255,0.82)' : c.sub;
      const accentCol = bgImg ? '#ffffff' : c.accent;
      const PAD = 130, CX = W / 2, CW = W - PAD * 2;
      const titleSize = slide.title.length > 55 ? 46 : slide.title.length > 35 ? 54 : 64;

      ctx.font = `bold ${titleSize}px Georgia, serif`;
      const titleLines = wrapText(ctx, slide.title, CW);
      const titleLineH = titleSize * 1.3;

      const rawLines = slide.content ? slide.content.split('\n').filter(l => l.trim()) : [];
      const bulletSize = 24;
      ctx.font = `${bulletSize}px 'Segoe UI', sans-serif`;
      const bulletRows = rawLines.flatMap(line => {
        const isBullet = line.startsWith('•');
        const clean = isBullet ? line.slice(1).trim() : line;
        return wrapText(ctx, clean, CW - 40).map((w, i) => ({ text: w, bullet: isBullet && i === 0 }));
      });
      const bulletRowH = bulletSize * 1.7;
      const hasSubtitle = !!slide.subtitle;
      const blockH = titleLines.length * titleLineH + (hasSubtitle ? 56 : 0) + (bulletRows.length > 0 ? 46 + bulletRows.length * bulletRowH : 0);
      let y = H / 2 - blockH / 2 + titleSize;

      ctx.font = `bold ${titleSize}px Georgia, serif`;
      ctx.fillStyle = textColor; ctx.textAlign = 'center';
      for (const line of titleLines) { ctx.fillText(line, CX, y); y += titleLineH; }

      if (hasSubtitle) {
        y += 14;
        ctx.font = "600 27px 'Segoe UI', sans-serif";
        ctx.fillStyle = accentCol; ctx.textAlign = 'center';
        ctx.fillText(slide.subtitle, CX, y); y += 42;
      }

      if (bulletRows.length > 0) {
        y += 10;
        ctx.save(); ctx.strokeStyle = accentCol + '55'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(CX - 180, y); ctx.lineTo(CX + 180, y); ctx.stroke(); ctx.restore();
        y += 36;
      }

      for (const row of bulletRows) {
        ctx.font = `${bulletSize}px 'Segoe UI', sans-serif`; ctx.textAlign = 'center';
        if (row.bullet) {
          const arrow = '▸';
          const arrowW = ctx.measureText(arrow + '  ').width;
          const totalW = ctx.measureText(arrow + '  ' + row.text).width;
          const startX = CX - totalW / 2;
          ctx.fillStyle = accentCol; ctx.textAlign = 'left'; ctx.fillText(arrow, startX, y);
          ctx.fillStyle = subColor; ctx.fillText('  ' + row.text, startX + arrowW, y);
        } else {
          ctx.fillStyle = subColor; ctx.textAlign = 'center'; ctx.fillText(row.text, CX, y);
        }
        y += bulletRowH;
      }
      resolve(canvas);
    }

    if (bgImageDataUrl) {
      const img = new Image();
      img.onload = () => draw(img);
      img.src = bgImageDataUrl;
    } else {
      draw(null);
    }
  });
}

// ─── Render helpers ───────────────────────────────────────────────────────────
function renderTemplatesGrid() {
  const grid = document.getElementById('templates-grid');
  grid.innerHTML = '';
  SLIDE_TEMPLATES.forEach(tmpl => {
    const c = tmpl.colors;
    const card = document.createElement('button');
    card.className = 'template-card' + (state.selectedTemplate?.id === tmpl.id ? ' selected' : '');
    card.style.borderColor = state.selectedTemplate?.id === tmpl.id ? c.accent : '#334155';
    card.style.boxShadow   = state.selectedTemplate?.id === tmpl.id ? `0 0 0 3px ${c.accent}40` : 'none';
    card.innerHTML = `
      <div class="tmpl-swatches">
        ${[c.bg, c.accent, c.text, c.sub].map(col => `<div class="tmpl-swatch" style="background:${col}"></div>`).join('')}
      </div>
      <div class="tmpl-info">
        <div class="tmpl-name"><span>${tmpl.icon}</span><span>${tmpl.name}</span></div>
        <div class="tmpl-accent-line" style="background:${c.accent}"></div>
      </div>
      ${state.selectedTemplate?.id === tmpl.id ? `<div class="tmpl-check" style="background:${c.accent}">✓</div>` : ''}
    `;
    card.addEventListener('click', () => {
      state.selectedTemplate = tmpl;
      renderTemplatesGrid();
      updateTemplateConfirm();
      updateComboPreview();
    });
    grid.appendChild(card);
  });
}

function updateTemplateConfirm() {
  const el = document.getElementById('template-confirm');
  const txt = document.getElementById('template-confirm-text');
  if (!state.selectedTemplate) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  txt.innerHTML = `<span style="color:#4ade80">✓</span> Paleta <strong>${state.selectedTemplate.name}</strong>${state.bgImage ? ' · <span style="color:#60a5fa">con imagen de fondo</span>' : ''}`;
}

function updateComboPreview() {
  const wrap = document.getElementById('bg-combo-preview');
  if (!state.bgImage || !state.selectedTemplate) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  document.getElementById('combo-img').src = state.bgImage;
  document.getElementById('combo-stripe').style.background = state.selectedTemplate.colors.accent;
}

function buildSlidePreviewEl(slide, template, index, total, bgImage) {
  const c = template.colors;
  const lines = slide.content ? slide.content.split('\n').filter(l => l.trim()) : [];
  const textCol = bgImage ? '#fff' : c.text;
  const subCol  = bgImage ? 'rgba(255,255,255,0.82)' : c.sub;
  const accCol  = bgImage ? '#fff' : c.accent;

  const div = document.createElement('div');
  div.className = 'slide-preview';
  div.style.background = bgImage ? '#000' : c.bg;
  div.style.border = `1.5px solid ${c.accent}30`;

  if (bgImage) {
    const img = document.createElement('img');
    img.className = 'sp-bg-img'; img.src = bgImage; img.alt = '';
    div.appendChild(img);
  } else {
    const glow = document.createElement('div');
    glow.className = 'sp-glow';
    glow.style.background = `radial-gradient(ellipse at 105% -5%, ${c.accent}22, transparent 55%)`;
    div.appendChild(glow);
  }

  const stripe = document.createElement('div');
  stripe.className = 'sp-stripe';
  stripe.innerHTML = `<div style="flex:0 0 45%;background:${bgImage?'rgba(255,255,255,0.85)':c.accent}"></div><div style="flex:1;background:${bgImage?'rgba(255,255,255,0.28)':c.accent+'30'}"></div>`;
  div.appendChild(stripe);

  const counter = document.createElement('div');
  counter.className = 'sp-counter';
  counter.style.color = subCol;
  counter.textContent = `${String(index+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}`;
  div.appendChild(counter);

  const content = document.createElement('div');
  content.className = 'sp-content';

  const titleSize = slide.title.length > 55 ? 'clamp(11px,2vw,20px)' : slide.title.length > 35 ? 'clamp(13px,2.4vw,24px)' : 'clamp(15px,2.9vw,29px)';
  const h2 = document.createElement('h2');
  h2.className = 'sp-title';
  h2.style.cssText = `color:${textCol};font-size:${titleSize}`;
  h2.textContent = slide.title;
  content.appendChild(h2);

  if (slide.subtitle) {
    const sub = document.createElement('div');
    sub.className = 'sp-subtitle';
    sub.style.color = accCol;
    sub.textContent = slide.subtitle;
    content.appendChild(sub);
  }

  if (lines.length > 0) {
    const divider = document.createElement('div');
    divider.className = 'sp-divider';
    divider.style.background = accCol + '45';
    content.appendChild(divider);

    const bullets = document.createElement('div');
    bullets.className = 'sp-bullets';
    lines.forEach(line => {
      const row = document.createElement('div');
      row.className = 'sp-bullet-row';
      row.style.color = subCol;
      if (line.startsWith('•')) {
        row.innerHTML = `<span class="sp-arrow" style="color:${accCol}">▸</span><span>${line.slice(1).trim()}</span>`;
      } else {
        row.textContent = line;
      }
      bullets.appendChild(row);
    });
    content.appendChild(bullets);
  }

  div.appendChild(content);
  return div;
}

function renderSlidesGrid() {
  const grid = document.getElementById('slides-grid');
  grid.innerHTML = '';
  const tmpl = state.selectedTemplate;
  const c = tmpl.colors;

  state.slides.forEach((slide, index) => {
    const item = document.createElement('div');
    item.className = 'slide-item';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'slide-toolbar';

    const num = document.createElement('span');
    num.className = 'slide-num';
    num.style.cssText = `color:${c.accent};background:${c.accent}18`;
    num.textContent = `#${String(index+1).padStart(2,'0')}`;
    toolbar.appendChild(num);

    const controls = document.createElement('div');
    controls.className = 'slide-controls';

    const btns = [
      { label:'↑', cls:'up',   disabled: index === 0,                  action: () => moveSlide(index, -1) },
      { label:'↓', cls:'down', disabled: index === state.slides.length-1, action: () => moveSlide(index, 1) },
      { label:'✏', cls:'edit', disabled: false,                         action: () => openEditModal(index) },
      { label:'✕', cls:'del',  disabled: false,                         action: () => removeSlide(index) },
    ];
    btns.forEach(b => {
      const btn = document.createElement('button');
      btn.className = `slide-ctrl-btn ${b.cls}`;
      btn.textContent = b.label;
      btn.disabled = b.disabled;
      btn.addEventListener('click', b.action);
      controls.appendChild(btn);
    });
    toolbar.appendChild(controls);
    item.appendChild(toolbar);

    // Preview
    const preview = buildSlidePreviewEl(slide, tmpl, index, state.slides.length, state.bgImage);
    item.appendChild(preview);
    grid.appendChild(item);
  });

  // Update count badge
  document.getElementById('slides-count-badge').textContent = `${state.slides.length} DIAPOSITIVAS • EN ORDEN`;

  // Update accent button
  const btnAdd = document.getElementById('btn-add-slide');
  btnAdd.style.cssText = `border:1px solid ${c.accent}50;color:${c.accent};background:${c.accent}12`;
}

function updateInfoStrip() {
  const tmpl = state.selectedTemplate;
  if (!tmpl) return;
  const c = tmpl.colors;
  const iconEl = document.getElementById('info-icon');
  if (state.bgImage) {
    iconEl.innerHTML = `<img src="${state.bgImage}" style="width:48px;height:28px;object-fit:cover;border-radius:4px;border:1px solid #334155">`;
  } else {
    iconEl.textContent = tmpl.icon;
    iconEl.style.fontSize = '18px';
  }
  document.getElementById('info-name').textContent = tmpl.name + (state.bgImage ? '' : '');
  const swatches = document.getElementById('info-swatches');
  swatches.innerHTML = [c.bg, c.accent, c.text, c.sub].map(col =>
    `<div class="info-swatch" style="background:${col}"></div>`
  ).join('');
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function updateStepNav() {
  document.querySelectorAll('.step-btn').forEach(btn => {
    const i = parseInt(btn.dataset.step);
    btn.classList.remove('active', 'done');
    const numEl = btn.querySelector('.step-num');
    if (i === state.step) {
      btn.classList.add('active');
      numEl.textContent = i + 1;
    } else if (i < state.step) {
      btn.classList.add('done');
      numEl.textContent = '✓';
    } else {
      numEl.textContent = i + 1;
    }
  });
  for (let i = 0; i < 2; i++) {
    const line = document.getElementById(`line-${i}-${i+1}`);
    if (line) line.classList.toggle('done', state.step > i);
  }
}

function goToStep(n) {
  if (n < 0 || n > 2) return;
  state.step = n;
  document.querySelectorAll('.step-section').forEach((s, i) => {
    s.classList.toggle('active', i === n);
    s.classList.toggle('hidden', i !== n);
  });
  updateStepNav();
  if (n === 1 && state.selectedTemplate) {
    document.getElementById('style-name').textContent = state.selectedTemplate.name;
  }
  if (n === 2) {
    renderSlidesGrid();
    updateInfoStrip();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Slide CRUD ───────────────────────────────────────────────────────────────
function moveSlide(i, d) {
  const ns = [...state.slides];
  const t = i + d;
  if (t < 0 || t >= ns.length) return;
  [ns[i], ns[t]] = [ns[t], ns[i]];
  state.slides = ns;
  renderSlidesGrid();
}

function removeSlide(i) {
  state.slides = state.slides.filter((_, idx) => idx !== i);
  renderSlidesGrid();
}

function addSlide() {
  state.slides.push({ title: 'Nueva diapositiva', subtitle: '', content: '• Contenido aquí\n• Segundo punto' });
  renderSlidesGrid();
}

// ─── Edit modal ───────────────────────────────────────────────────────────────
function openEditModal(index) {
  state.editingIndex = index;
  const slide = state.slides[index];
  document.getElementById('edit-title').value   = slide.title || '';
  document.getElementById('edit-subtitle').value = slide.subtitle || '';
  document.getElementById('edit-content').value  = slide.content || '';
  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  state.editingIndex = null;
}

function saveEditModal() {
  if (state.editingIndex === null) return;
  state.slides[state.editingIndex] = {
    title:    document.getElementById('edit-title').value,
    subtitle: document.getElementById('edit-subtitle').value,
    content:  document.getElementById('edit-content').value,
  };
  closeEditModal();
  renderSlidesGrid();
}

// ─── Generate slides ──────────────────────────────────────────────────────────
async function generateSlides() {
  const text = document.getElementById('content-textarea').value.trim();
  if (!text || !state.selectedTemplate) return;

  if (!API_KEY) {
    showError('Agrega tu API key de Anthropic en la variable API_KEY dentro de app.js');
    return;
  }

  state.loading = true;
  hideError();
  setGenerateLoading(true);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        messages: [{
          role: 'user',
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
      "content": "• Punto uno claro y directo\\n• Punto dos\\n• Punto tres"
    }
  ]
}

Reglas: 4-7 diapositivas en orden del texto. Primera diapositiva: título/intro. Bullets comienzan con •. Máx 4 bullets, cada uno máx 12 palabras. Si no hay subtítulo pon "".`,
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const raw = (data.content || []).map(b => b.text || '').join('');
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    state.slides = parsed.slides || [];
    goToStep(2);
  } catch (e) {
    showError('Error al generar las diapositivas: ' + e.message);
    console.error(e);
  } finally {
    state.loading = false;
    setGenerateLoading(false);
  }
}

function setGenerateLoading(on) {
  const btn = document.getElementById('btn-generate');
  const txt = document.getElementById('btn-generate-text');
  const spin = document.getElementById('spinner-generate');
  btn.disabled = on;
  txt.textContent = on ? 'Generando diapositivas...' : '✦ Generar diapositivas';
  spin.classList.toggle('hidden', !on);
}

function showError(msg) {
  const box = document.getElementById('error-box');
  document.getElementById('error-msg').textContent = msg;
  box.classList.remove('hidden');
}
function hideError() { document.getElementById('error-box').classList.add('hidden'); }

// ─── Download JPGs ────────────────────────────────────────────────────────────
async function downloadAllJPGs() {
  if (!state.slides.length || !state.selectedTemplate || state.downloading) return;
  state.downloading = true;
  state.downloadProgress = 0;

  const btn = document.getElementById('btn-download');
  const txt = document.getElementById('btn-download-text');
  const spin = document.getElementById('spinner-download');
  const bar = document.getElementById('download-progress-bar');
  const fill = document.getElementById('progress-fill');
  const fname = document.getElementById('progress-filename');

  btn.disabled = true;
  txt.textContent = `0/${state.slides.length} descargando...`;
  spin.classList.remove('hidden');
  bar.classList.remove('hidden');

  await new Promise(r => setTimeout(r, 60));

  for (let i = 0; i < state.slides.length; i++) {
    const canvas = await renderSlideToCanvas(state.slides[i], state.selectedTemplate, i, state.slides.length, state.bgImage);
    const url = canvas.toDataURL('image/jpeg', 0.95);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diapositiva-${String(i+1).padStart(2,'0')}.jpg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);

    state.downloadProgress = i + 1;
    const pct = (state.downloadProgress / state.slides.length) * 100;
    fill.style.width = pct + '%';
    fname.textContent = `diapositiva-${String(i+1).padStart(2,'0')}.jpg`;
    txt.textContent = `${state.downloadProgress}/${state.slides.length} descargando...`;

    await new Promise(r => setTimeout(r, 380));
  }

  state.downloading = false;
  btn.disabled = false;
  txt.textContent = `Descargar JPG (${state.slides.length})`;
  spin.classList.add('hidden');
  bar.classList.add('hidden');
  fill.style.width = '0%';
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Render templates
  renderTemplatesGrid();

  // Step nav clicks
  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.step);
      if (i <= state.step) goToStep(i);
    });
  });

  // Upload area
  const uploadArea = document.getElementById('upload-area');
  const fileInput  = document.getElementById('file-input');
  uploadArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    state.bgFileName = file.name;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      const img = new Image();
      img.onload = () => {
        state.bgImage = dataUrl;
        document.getElementById('bg-thumb').src = dataUrl;
        document.getElementById('bg-filename').textContent = file.name;
        document.getElementById('upload-area').classList.add('hidden');
        document.getElementById('bg-preview').classList.remove('hidden');
        updateTemplateConfirm();
        updateComboPreview();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btn-change-bg').addEventListener('click', () => fileInput.click());
  document.getElementById('btn-remove-bg').addEventListener('click', () => {
    state.bgImage = null; state.bgFileName = '';
    fileInput.value = '';
    document.getElementById('bg-preview').classList.add('hidden');
    document.getElementById('upload-area').classList.remove('hidden');
    document.getElementById('bg-combo-preview').classList.add('hidden');
    updateTemplateConfirm();
  });

  // Step 1 → 2
  document.getElementById('btn-to-content').addEventListener('click', () => goToStep(1));

  // Textarea stats
  const textarea = document.getElementById('content-textarea');
  textarea.addEventListener('input', () => {
    const val = textarea.value;
    const words = val.trim().split(/\s+/).filter(Boolean).length;
    document.getElementById('text-stats').textContent = `${val.length} chars · ${words} palabras`;
  });

  // Step 2 buttons
  document.getElementById('btn-back-template').addEventListener('click', () => goToStep(0));
  document.getElementById('btn-generate').addEventListener('click', generateSlides);

  // Step 3 buttons
  document.getElementById('btn-regenerate').addEventListener('click', () => {
    state.slides = [];
    goToStep(1);
  });
  document.getElementById('btn-add-slide').addEventListener('click', addSlide);
  document.getElementById('btn-download').addEventListener('click', downloadAllJPGs);
  document.getElementById('btn-change-format').addEventListener('click', () => goToStep(0));
  document.getElementById('btn-new-presentation').addEventListener('click', () => {
    state.slides = []; state.selectedTemplate = null;
    state.bgImage = null; state.bgFileName = '';
    state.step = 0;
    document.getElementById('content-textarea').value = '';
    document.getElementById('bg-preview').classList.add('hidden');
    document
