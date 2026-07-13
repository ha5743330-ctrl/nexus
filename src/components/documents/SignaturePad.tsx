import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  toBlob: () => Promise<Blob | null>;
}

interface SignaturePadProps {
  width?: number;
  height?: number;
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  ({ width = 500, height = 180 }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const hasDrawn = useRef(false);
    const lastPoint = useRef<{ x: number; y: number } | null>(null);
    const [isEmptyState, setIsEmptyState] = useState(true);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Scale for crisp lines on high-DPI screens
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1f2937';
      }
    }, [width, height]);

    const getPoint = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        const touch = e.touches[0];
        if (!touch) return null;
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      const point = getPoint(e);
      if (!point) return;
      isDrawing.current = true;
      lastPoint.current = point;
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const point = getPoint(e);
      if (!ctx || !point || !lastPoint.current) return;

      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();

      lastPoint.current = point;
      if (!hasDrawn.current) {
        hasDrawn.current = true;
        setIsEmptyState(false);
      }
    };

    const stopDrawing = () => {
      isDrawing.current = false;
      lastPoint.current = null;
    };

    useImperativeHandle(ref, () => ({
      clear: () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        hasDrawn.current = false;
        setIsEmptyState(true);
      },
      isEmpty: () => !hasDrawn.current,
      toBlob: () =>
        new Promise((resolve) => {
          const canvas = canvasRef.current;
          if (!canvas) return resolve(null);
          canvas.toBlob((blob) => resolve(blob), 'image/png');
        }),
    }));

    return (
      <div>
        <canvas
          ref={canvasRef}
          className="border border-gray-300 rounded-md bg-white cursor-crosshair touch-none w-full"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {isEmptyState && (
          <p className="text-xs text-gray-400 mt-1">Draw your signature above using your mouse or finger</p>
        )}
      </div>
    );
  }
);

SignaturePad.displayName = 'SignaturePad';
