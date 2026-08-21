import React from 'react';
import type { CanvasElement } from '../types';

interface HorizontalRulerProps {
  canvasW: number;
  fullW: number;
  selectedEl?: CanvasElement | null;
  unit?: 'px' | '%';
}

interface VerticalRulerProps {
  canvasH: number;
  fullH: number;
  selectedEl?: CanvasElement | null;
  unit?: 'px' | '%';
}

export const HorizontalRuler: React.FC<HorizontalRulerProps> = ({
  canvasW,
  fullW,
  selectedEl,
  unit = 'px',
}) => {
  const height = 20;
  const scale = canvasW / fullW;

  const step = unit === 'px' ? (fullW >= 1500 ? 100 : 50) : 10;
  const majorStep = unit === 'px' ? (fullW >= 1500 ? 200 : 100) : 20;

  const ticks: React.ReactNode[] = [];
  const maxVal = unit === 'px' ? fullW : 100;

  for (let val = 0; val <= maxVal; val += (unit === 'px' ? 20 : 5)) {
    const posPx = unit === 'px' ? val * scale : (val / 100) * canvasW;
    const isMajor = val % majorStep === 0;
    const isMedium = val % step === 0;
    const tickH = isMajor ? 12 : isMedium ? 7 : 4;

    ticks.push(
      <line
        key={`h-tick-${val}`}
        x1={posPx}
        y1={height - tickH}
        x2={posPx}
        y2={height}
        stroke="rgba(255, 255, 255, 0.25)"
        strokeWidth="1"
      />
    );

    if (isMajor && posPx < canvasW - 20) {
      ticks.push(
        <text
          key={`h-text-${val}`}
          x={posPx + 2}
          y={height - 8}
          fill="rgba(255, 255, 255, 0.6)"
          fontSize="8px"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {val}
        </text>
      );
    }
  }

  let tracker: React.ReactNode = null;
  if (selectedEl) {
    const xPx = (selectedEl.x / 100) * canvasW;
    const wPx = Math.max(2, (selectedEl.w / 100) * canvasW);
    tracker = (
      <rect
        x={xPx}
        y={0}
        width={wPx}
        height={height}
        fill="rgba(99, 102, 241, 0.35)"
        stroke="rgba(129, 140, 248, 0.8)"
        strokeWidth="1"
      />
    );
  }

  return (
    <svg
      width={canvasW}
      height={height}
      style={{
        display: 'block',
        background: '#0d1117',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        userSelect: 'none',
      }}
    >
      {tracker}
      {ticks}
    </svg>
  );
};

export const VerticalRuler: React.FC<VerticalRulerProps> = ({
  canvasH,
  fullH,
  selectedEl,
  unit = 'px',
}) => {
  const width = 20;
  const scale = canvasH / fullH;

  const step = unit === 'px' ? (fullH >= 1200 ? 100 : 50) : 10;
  const majorStep = unit === 'px' ? (fullH >= 1200 ? 200 : 100) : 20;

  const ticks: React.ReactNode[] = [];
  const maxVal = unit === 'px' ? fullH : 100;

  for (let val = 0; val <= maxVal; val += (unit === 'px' ? 20 : 5)) {
    const posPx = unit === 'px' ? val * scale : (val / 100) * canvasH;
    const isMajor = val % majorStep === 0;
    const isMedium = val % step === 0;
    const tickW = isMajor ? 12 : isMedium ? 7 : 4;

    ticks.push(
      <line
        key={`v-tick-${val}`}
        x1={width - tickW}
        y1={posPx}
        x2={width}
        y2={posPx}
        stroke="rgba(255, 255, 255, 0.25)"
        strokeWidth="1"
      />
    );

    if (isMajor && posPx < canvasH - 15) {
      ticks.push(
        <text
          key={`v-text-${val}`}
          x={1}
          y={posPx + 8}
          fill="rgba(255, 255, 255, 0.6)"
          fontSize="7px"
          fontFamily="system-ui, -apple-system, sans-serif"
          transform={`rotate(-90 8 ${posPx + 8})`}
        >
          {val}
        </text>
      );
    }
  }

  let tracker: React.ReactNode = null;
  if (selectedEl) {
    const yPx = (selectedEl.y / 100) * canvasH;
    const hPx = Math.max(2, (selectedEl.h / 100) * canvasH);
    tracker = (
      <rect
        x={0}
        y={yPx}
        width={width}
        height={hPx}
        fill="rgba(99, 102, 241, 0.35)"
        stroke="rgba(129, 140, 248, 0.8)"
        strokeWidth="1"
      />
    );
  }

  return (
    <svg
      width={width}
      height={canvasH}
      style={{
        display: 'block',
        background: '#0d1117',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        userSelect: 'none',
      }}
    >
      {tracker}
      {ticks}
    </svg>
  );
};
