import { jsPDF } from 'jspdf';
import pptxgen from 'pptxgenjs';
import JSZip from 'jszip';
import type { Slide, ViewportMode, CustomCanvasSize } from '../types';
import {
  captureFullResolutionSlide,
  getViewportDimensions,
  processInBatches,
} from './captureSlide';

const BATCH_SIZE = 6;

export const exportCurrentJpg = async (
  slide: Slide,
  slideIndex: number,
  globalStyle: unknown,
  viewportMode: ViewportMode,
  onProgress: (msg: string) => void,
  customCanvas?: CustomCanvasSize,
): Promise<void> => {
  onProgress('Generando imagen JPG...');
  const dataUrl = await captureFullResolutionSlide(slide, globalStyle, viewportMode, customCanvas);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `diapositiva_${slideIndex + 1}.jpg`;
  link.click();
};

export const exportAllJpg = async (
  slides: Slide[],
  globalStyle: unknown,
  viewportMode: ViewportMode,
  onProgress: (msg: string) => void,
  customCanvas?: CustomCanvasSize,
): Promise<void> => {
  const zip = new JSZip();
  const results = await processInBatches(
    slides,
    BATCH_SIZE,
    (slide, index) => captureFullResolutionSlide(slide, globalStyle, viewportMode, customCanvas).then((dataUrl) => ({ index, dataUrl })),
    (completed, total) => onProgress(`Capturando diapositiva ${completed} de ${total}...`),
  );
  results.sort((a, b) => a.index - b.index);
  for (const res of results) {
    const base64Data = res.dataUrl.split(',')[1];
    zip.file(`diapositiva_${res.index + 1}.jpg`, base64Data, { base64: true });
  }
  onProgress('Comprimiendo archivo ZIP...');
  const content = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(content);
  link.download = 'diapositivas_predica.zip';
  link.click();
};

export const exportPdf = async (
  slides: Slide[],
  globalStyle: unknown,
  viewportMode: ViewportMode,
  onProgress: (msg: string) => void,
  customCanvas?: CustomCanvasSize,
): Promise<void> => {
  const dims = getViewportDimensions(viewportMode, customCanvas);
  const orientation = dims.width > dims.height ? 'l' : 'p';
  const pdf = new jsPDF({ orientation, unit: 'px', format: [dims.width, dims.height] });
  const results = await processInBatches(
    slides,
    BATCH_SIZE,
    (slide, index) => captureFullResolutionSlide(slide, globalStyle, viewportMode, customCanvas).then((dataUrl) => ({ index, dataUrl })),
    (completed, total) => onProgress(`Renderizando PDF: página ${completed} de ${total}...`),
  );
  results.sort((a, b) => a.index - b.index);
  for (let i = 0; i < results.length; i++) {
    if (i > 0) pdf.addPage([dims.width, dims.height], orientation);
    pdf.addImage(results[i].dataUrl, 'JPEG', 0, 0, dims.width, dims.height);
  }
  onProgress('Generando archivo PDF...');
  pdf.save('diapositivas_predica.pdf');
};

export const exportPptx = async (
  slides: Slide[],
  globalStyle: unknown,
  viewportMode: ViewportMode,
  onProgress: (msg: string) => void,
  customCanvas?: CustomCanvasSize,
): Promise<void> => {
  const pptx = new pptxgen();
  if (viewportMode === 'mobile') {
    pptx.defineLayout({ name: 'MOBILE', width: 5.625, height: 10.0 });
    pptx.layout = 'MOBILE';
  } else if (viewportMode === 'tablet') {
    pptx.layout = 'LAYOUT_4x3';
  } else if (viewportMode === 'custom' && customCanvas) {
    const ratio = customCanvas.width / customCanvas.height;
    pptx.defineLayout({ name: 'CUSTOM', width: 10, height: 10 / ratio });
    pptx.layout = 'CUSTOM';
  } else {
    pptx.layout = 'LAYOUT_16x9';
  }
  const results = await processInBatches(
    slides,
    BATCH_SIZE,
    (slide, index) => captureFullResolutionSlide(slide, globalStyle, viewportMode, customCanvas).then((dataUrl) => ({ index, dataUrl })),
    (completed, total) => onProgress(`Preparando PPTX: diapositiva ${completed} de ${total}...`),
  );
  results.sort((a, b) => a.index - b.index);
  for (const res of results) {
    const pptxSlide = pptx.addSlide();
    pptxSlide.addImage({ data: res.dataUrl, x: 0, y: 0, w: '100%', h: '100%' });
  }
  onProgress('Generando archivo PowerPoint...');
  await pptx.writeFile({ fileName: 'presentacion_predica.pptx' });
};
