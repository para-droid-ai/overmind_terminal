import React, { useRef, useState, useEffect, useCallback } from 'react';

interface WeightSliderProps {
  value: number; // Range 0-2
  color: string;
  onInput: (value: number) => void;
  className?: string;
  promptId: string; // Unique ID for ARIA labels
}

const DIAL_MAX_ROTATION_FROM_CENTER = 135; // Max degrees of rotation from the center (straight up)
const SENSITIVITY_FACTOR = 0.01; // Adjust for drag sensitivity

const WeightSlider: React.FC<WeightSliderProps> = ({ value, color, onInput, className = "", promptId }) => {
  const dialRef = useRef<HTMLDivElement>(null);
  const [internalValue, setInternalValue] = useState(value);
  const initialDragValueRef = useRef(0);
  const initialDragYRef = useRef(0);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const updateValueFromDrag = useCallback((clientY: number) => {
    if (!dialRef.current) return;
    const dy = clientY - initialDragYRef.current;
    // Invert dy because dragging down should decrease value typically, but depends on preference
    const newValue = Math.max(0, Math.min(2, initialDragValueRef.current - (dy * SENSITIVITY_FACTOR)));
    setInternalValue(newValue);
    onInput(newValue);
  }, [onInput]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!dialRef.current) return;
    dialRef.current.setPointerCapture(e.pointerId);
    initialDragYRef.current = e.clientY;
    initialDragValueRef.current = internalValue;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      updateValueFromDrag(moveEvent.clientY);
    };

    const handlePointerUp = () => {
      if (dialRef.current) {
        dialRef.current.releasePointerCapture(e.pointerId);
      }
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp, { once: true });
  }, [internalValue, updateValueFromDrag]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY;
    // Adjust wheel sensitivity, ensure it's inverted compared to drag if needed
    const newValue = Math.max(0, Math.min(2, internalValue + delta * -0.0025)); 
    setInternalValue(newValue);
    onInput(newValue);
  }, [internalValue, onInput]);
  
  // New rotation logic:
  // Value 0 -> -DIAL_MAX_ROTATION_FROM_CENTER degrees
  // Value 1 -> 0 degrees (straight up)
  // Value 2 -> +DIAL_MAX_ROTATION_FROM_CENTER degrees
  const rotation = (internalValue - 1) * DIAL_MAX_ROTATION_FROM_CENTER;
  const displayValue = internalValue.toFixed(2);

  return (
    <div
      ref={dialRef}
      className={`relative flex flex-col items-center justify-start cursor-ns-resize touch-none select-none ${className}`}
      onPointerDown={handlePointerDown}
      onWheel={handleWheel}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={2}
      aria-valuenow={parseFloat(displayValue)}
      aria-labelledby={`lyria-prompt-label-${promptId}`} 
      aria-describedby={`lyria-prompt-value-${promptId}`}
      tabIndex={0} 
    >
      <svg viewBox="-10 -10 120 120" width="40" height="40" className="mb-0.5">
        {/* Dial Background */}
        <circle cx="50" cy="50" r="48" fill="rgba(0,0,0,0.3)" stroke={color} strokeWidth="3" />
        {/* Dial Track: Full 270 degree arc for visual reference */}
        <path 
          d="M 12.57 77.43 A 45 45 0 1 1 87.43 77.43" // Arc from -135 to +135 (approx)
          transform="rotate(-135 50 50)" // Initial rotation to align visual start
          fill="none" 
          stroke="rgba(255,255,255,0.1)" 
          strokeWidth="5" 
          strokeLinecap="round"
        />
        {/* Dial Pointer */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="10" // Points upwards initially (0 degrees)
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          transform={`rotate(${rotation} 50 50)`}
          className="transition-transform duration-50 ease-out"
        />
        {/* Center Knob */}
        <circle cx="50" cy="50" r="8" fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth="2"/>
      </svg>
      <div id={`lyria-prompt-value-${promptId}`} className="text-[10px] text-[var(--color-text-muted)] select-none text-center">
        {displayValue}
      </div>
    </div>
  );
};

export default WeightSlider;