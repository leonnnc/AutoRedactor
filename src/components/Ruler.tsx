import React from 'react';
import type { CanvasElement } from '../types';

interface HorizontalRulerProps {
  canvasW: number;
  fullW: number;
  zoom: number;
  selectedEl?: CanvasElement | null;
  unit?: 'px' | '%';
}

interface VerticalRulerProps {
  canvasH: number;
  fullH: number;
  zoom: number;
  selectedEl?: CanvasElement | null;
  unit?: 'px' | '%';
}

export const HorizontalRuler: React.FC<HorizontalRulerProps> = ({
  canvasW,
  fullW,
  zoom,
  selectedEl,
  unit = 'px',
}) => {
  const height = 20;
  const displayW = canvasW * zoom;
  const scale = displayW / fullW;
  const svgW = 4000;
  const centerX = svgW / 2;

  const step = unit === 'px' ? (fullW >= 1500 ? 100 : 50) : 10;
  const majorStep = unit === 'px' ? (fullW >= 1500 ? 200 : 100) : 20;

  const ticks: React.ReactNode[] = [];
  const maxVal = unit === 'px' ? Math.max(fullW, 3000 / scale) : 200;

  for (let val = 0; val <= maxVal; val += (unit === 'px' ? 20 : 5)) {
    const offsetPx = unit === 'px' ? val * scale : (val / 100) * displayW;
    const isMajor = val % majorStep === 0;
    const isMedium = val % step === 0;
    const tickH = isMajor ? 12 : isMedium ? 7 : 4;
    const isZero = val === 0;
    const strokeColor = isZero ? '#818cf8' : 'rgba(255, 255, 255, 0.25)';

    // Right side (positive)
    ticks.push(
      <line key={`h-tick-r-${val}`} x1={centerX + offsetPx} y1={height - tickH} x2={centerX + offsetPx} y2={height} stroke={strokeColor} strokeWidth={isZero ? "2" : "1"} />
    );
    if (isMajor) {
      ticks.push(
        <text key={`h-text-r-${val}`} x={centerX + offsetPx + 2} y={height - 8} fill={isZero ? '#818cf8' : 'rgba(255, 255, 255, 0.6)'} fontSize="9px" fontFamily="sans-serif">
          {val}
        </text>
      );
    }

    // Left side (negative)
    if (val > 0) {
      ticks.push(
        <line key={`h-tick-l-${val}`} x1={centerX - offsetPx} y1={height - tickH} x2={centerX - offsetPx} y2={height} stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1" />
      );
      if (isMajor) {
        ticks.push(
          <text key={`h-text-l-${val}`} x={centerX - offsetPx + 2} y={height - 8} fill="rgba(255, 255, 255, 0.6)" fontSize="9px" fontFamily="sans-serif">
            -{val}
          </text>
        );
      }
    }
  }

  let tracker: React.ReactNode = null;
  if (selectedEl) {
    // selectedEl.x is percentage from top-left.
    // Convert to offset from center. Center of canvas is 50%.
    const xPctFromCenter = selectedEl.x - 50;
    const xPx = centerX + (xPctFromCenter / 100) * displayW;
    const wPx = Math.max(2, (selectedEl.w / 100) * displayW);
    tracker = (
      <rect x={xPx} y={0} width={wPx} height={height} fill="rgba(99, 102, 241, 0.35)" stroke="rgba(129, 140, 248, 0.8)" strokeWidth="1" />
    );
  }

  return (
    <svg width={svgW} height={height} style={{ display: 'block', background: '#0d1117', userSelect: 'none' }}>
      {tracker}
      {ticks}
    </svg>
  );
};

export const VerticalRuler: React.FC<VerticalRulerProps> = ({
  canvasH,
  fullH,
  zoom,
  selectedEl,
  unit = 'px',
}) => {
  const width = 20;
  const displayH = canvasH * zoom;
  const scale = displayH / fullH;
  const svgH = 4000;
  const centerY = svgH / 2;

  const step = unit === 'px' ? (fullH >= 1200 ? 100 : 50) : 10;
  const majorStep = unit === 'px' ? (fullH >= 1200 ? 200 : 100) : 20;

  const ticks: React.ReactNode[] = [];
  const maxVal = unit === 'px' ? Math.max(fullH, 3000 / scale) : 200;

  for (let val = 0; val <= maxVal; val += (unit === 'px' ? 20 : 5)) {
    const offsetPx = unit === 'px' ? val * scale : (val / 100) * displayH;
    const isMajor = val % majorStep === 0;
    const isMedium = val % step === 0;
    const tickW = isMajor ? 12 : isMedium ? 7 : 4;
    const isZero = val === 0;
    const strokeColor = isZero ? '#818cf8' : 'rgba(255, 255, 255, 0.25)';

    // Bottom side (positive)
    ticks.push(
      <line key={`v-tick-b-${val}`} x1={width - tickW} y1={centerY + offsetPx} x2={width} y2={centerY + offsetPx} stroke={strokeColor} strokeWidth={isZero ? "2" : "1"} />
    );
    if (isMajor) {
      ticks.push(
        <text key={`v-text-b-${val}`} x={2} y={centerY + offsetPx + 8} fill={isZero ? '#818cf8' : 'rgba(255, 255, 255, 0.6)'} fontSize="9px" fontFamily="sans-serif" transform={`rotate(-90 8 ${centerY + offsetPx + 8})`}>
          {val}
        </text>
      );
    }

    // Top side (negative)
    if (val > 0) {
      ticks.push(
        <line key={`v-tick-t-${val}`} x1={width - tickW} y1={centerY - offsetPx} x2={width} y2={centerY - offsetPx} stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1" />
      );
      if (isMajor) {
        ticks.push(
          <text key={`v-text-t-${val}`} x={2} y={centerY - offsetPx + 8} fill="rgba(255, 255, 255, 0.6)" fontSize="9px" fontFamily="sans-serif" transform={`rotate(-90 8 ${centerY - offsetPx + 8})`}>
            -{val}
          </text>
        );
      }
    }
  }

  let tracker: React.ReactNode = null;
  if (selectedEl) {
    const yPctFromCenter = selectedEl.y - 50;
    const yPx = centerY + (yPctFromCenter / 100) * displayH;
    const hPx = Math.max(2, (selectedEl.h / 100) * displayH);
    tracker = (
      <rect x={0} y={yPx} width={width} height={hPx} fill="rgba(99, 102, 241, 0.35)" stroke="rgba(129, 140, 248, 0.8)" strokeWidth="1" />
    );
  }

  return (
    <svg width={width} height={svgH} style={{ display: 'block', background: '#0d1117', userSelect: 'none' }}>
      {tracker}
      {ticks}
    </svg>
  );
};
