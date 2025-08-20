
import React from 'react';

const RotatingGlobe: React.FC = () => {
  return (
    <div className="w-32 h-32 mx-auto my-4 border-2 border-green-700 rounded-full relative overflow-hidden bg-black">
      <style>
        {`
          @keyframes rotateGlobe {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes rotateOverlay {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes scanline {
            0%, 100% { transform: translateY(0); opacity: 0.3; }
            50% { transform: translateY(2px); opacity: 0.1; }
          }
          .globe-surface {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: linear-gradient(
              90deg,
              rgba(0,50,0,0.8) 0%, 
              rgba(0,150,0,0.6) 25%, 
              rgba(0,80,0,0.7) 50%, 
              rgba(0,180,0,0.5) 75%, 
              rgba(0,50,0,0.8) 100%
            );
            background-size: 400% 100%;
            animation: rotateGlobe 20s linear infinite;
            position: absolute;
            filter: blur(0.5px);
          }
          .globe-grid {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            position: absolute;
            background-image: 
              repeating-linear-gradient(0deg, transparent, transparent 9px, rgba(0,255,0,0.15) 10px, transparent 11px),
              repeating-linear-gradient(90deg, transparent, transparent 9px, rgba(0,255,0,0.15) 10px, transparent 11px);
            animation: rotateOverlay 30s linear infinite reverse;
            opacity: 0.5;
          }
          .globe-glare {
            width: 70%;
            height: 70%;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, rgba(100,255,100,0.3), transparent 70%);
            position: absolute;
            top: 5%;
            left: 5%;
            opacity: 0.7;
          }
          .globe-scanline {
            width: 100%;
            height: 2px; /* Thinner scanline */
            background-color: rgba(0, 255, 0, 0.1); /* Softer scanline */
            position: absolute;
            top: 0;
            animation: scanline 0.15s linear infinite alternate; /* Faster, more subtle flicker */
            z-index: 1;
            opacity: 0.2;
          }
        `}
      </style>
      <div className="globe-surface"></div>
      <div className="globe-grid"></div>
      <div className="globe-glare"></div>
      <div className="globe-scanline" style={{ top: '20%' }}></div>
      <div className="globe-scanline" style={{ top: '50%', animationDelay: '0.05s' }}></div>
      <div className="globe-scanline" style={{ top: '80%', animationDelay: '0.1s' }}></div>
    </div>
  );
};

export default RotatingGlobe;
