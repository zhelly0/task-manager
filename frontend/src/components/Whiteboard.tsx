import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Stroke {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  size: number;
}

const SOCKET_PATH = '/api/realtime';

const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const drawingRef = useRef(false);
  const prevPointRef = useRef<{ x: number; y: number } | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState('#111827');
  const [size, setSize] = useState(3);

  const getContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const ratio = window.devicePixelRatio || 1;
    const cssWidth = parent.clientWidth;
    const cssHeight = 520;

    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.floor(cssWidth * ratio);
    canvas.height = Math.floor(cssHeight * ratio);

    const ctx = getContext();
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    redrawAll(strokes);
  };

  const drawStroke = (stroke: Stroke) => {
    const ctx = getContext();
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(stroke.x0, stroke.y0);
    ctx.lineTo(stroke.x1, stroke.y1);
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const redrawAll = (allStrokes: Stroke[]) => {
    const ctx = getContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    allStrokes.forEach(drawStroke);
  };

  const getPoint = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getPoint(event);
    if (!point) return;

    drawingRef.current = true;
    prevPointRef.current = point;
  };

  const stopDrawing = () => {
    drawingRef.current = false;
    prevPointRef.current = null;
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;

    const current = getPoint(event);
    const previous = prevPointRef.current;

    if (!current || !previous) return;

    const stroke: Stroke = {
      x0: previous.x,
      y0: previous.y,
      x1: current.x,
      y1: current.y,
      color,
      size
    };

    drawStroke(stroke);
    setStrokes((prev) => [...prev, stroke]);
    socketRef.current?.emit('whiteboard:draw', stroke);

    prevPointRef.current = current;
  };

  const clearBoard = () => {
    setStrokes([]);
    redrawAll([]);
    socketRef.current?.emit('whiteboard:clear');
  };

  useEffect(() => {
    socketRef.current = io({
      path: SOCKET_PATH,
      transports: ['polling', 'websocket']
    });

    socketRef.current.on('whiteboard:init', (initialStrokes: Stroke[]) => {
      setStrokes(initialStrokes || []);
    });

    socketRef.current.on('whiteboard:draw', (stroke: Stroke) => {
      setStrokes((prev) => [...prev, stroke]);
    });

    socketRef.current.on('whiteboard:clear', () => {
      setStrokes([]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    redrawAll(strokes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  return (
    <section className="whiteboard-wrap">
      <div className="whiteboard-toolbar">
        <label>
          Color
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="whiteboard-color"
          />
        </label>

        <label>
          Brush
          <input
            type="range"
            min={1}
            max={14}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
          <span>{size}px</span>
        </label>

        <button className="btn btn-danger" type="button" onClick={clearBoard}>
          Clear Board
        </button>
      </div>

      <div className="whiteboard-canvas-shell">
        <canvas
          ref={canvasRef}
          className="whiteboard-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>
      <p className="whiteboard-note">Everyone connected sees updates in real time.</p>
    </section>
  );
};

export default Whiteboard;
