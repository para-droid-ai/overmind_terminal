
import React, { useEffect, useRef, useCallback } from 'react';
import { MatrixSettings } from '../types';
import { KATAKANA_CHARS } from '../constants'; // Default to Katakana, can be made dynamic if needed

interface MatrixBackgroundProps {
  settings: MatrixSettings;
  onFPSUpdate: (fps: number) => void;
  isProcessing?: boolean; // --- FIX: Add this new prop ---
}

const MatrixBackground: React.FC<MatrixBackgroundProps> = ({ settings, onFPSUpdate, isProcessing = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(0);
  const fpsDataRef = useRef<{ lastUpdateTime: number; frameCount: number; }>({ lastUpdateTime: Date.now(), frameCount: 0});

  const draw = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, columns: number[], drops: number[]) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = settings.matrixColor; // Use theme-based color
    ctx.font = '15px monospace';

    const charsToUse = KATAKANA_CHARS; // Using Katakana as a default

    for (let i = 0; i < columns.length; i++) {
      const text = charsToUse[Math.floor(Math.random() * charsToUse.length)];
      ctx.fillText(text, i * 15, drops[i] * 15);

      if (drops[i] * 15 > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;

      if (settings.glitchEffect && Math.random() < 0.005) {
        drops[i] = Math.floor(Math.random() * (canvas.height / 15));
      }
    }
  }, [settings.glitchEffect, settings.matrixColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const setupCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const fontSize = 15;
      const numColumns = Math.floor(canvas.width / fontSize);
      const columns = Array(numColumns).fill(1);
      const drops = Array(numColumns).fill(0).map(() => Math.floor(Math.random() * (canvas.height / fontSize)));
      
      return { columns, drops };
    };

    let { columns, drops } = setupCanvas();
    
    const renderLoop = (timestamp: number) => {
      if (!settings.isPaused) {
        const now = Date.now();
        fpsDataRef.current.frameCount++;
        if (now - fpsDataRef.current.lastUpdateTime >= 1000) {
          onFPSUpdate(fpsDataRef.current.frameCount);
          fpsDataRef.current.frameCount = 0;
          fpsDataRef.current.lastUpdateTime = now;
        }

        // --- THE FIX: Dynamically throttle speed based on app processing state ---
        // If the app is busy, slow the matrix to a crawl (1 frame/sec). Otherwise, use user setting.
        const currentSpeed = isProcessing ? 1000 : settings.speed;
        // --- END OF FIX ---

        if (timestamp - lastUpdateTimeRef.current > currentSpeed) { // Use the new dynamic speed variable
          draw(ctx, canvas, columns, drops);
          lastUpdateTimeRef.current = timestamp;
        }
      }
      animationFrameId.current = requestAnimationFrame(renderLoop);
    };

    animationFrameId.current = requestAnimationFrame(renderLoop);

    const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          const newSetup = setupCanvas();
          columns = newSetup.columns;
          drops = newSetup.drops;
          if (ctx && canvas && !settings.isPaused) {
            draw(ctx, canvas, columns, drops);
          }
        }, 250); 
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [settings.isPaused, settings.speed, draw, onFPSUpdate, isProcessing]); // --- FIX: Add isProcessing ---

  return <canvas ref={canvasRef} id="matrix-canvas" aria-hidden="true" className="fixed top-0 left-0 w-full h-full z-0"></canvas>;
};

export default MatrixBackground;