
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NoosphericNodeData, NoosphericPlayerId, NoosphericGameState, NoosphericPhase } from '../../types';

interface NoosphericMapDisplayProps {
  nodes: NoosphericNodeData[];
  onNodeClick: (nodeId: string) => void;
  selectedNodeId: string | null;
  factionColors: {
    'GEM-Q': string;
    'AXIOM': string;
    'NEUTRAL': string;
    'KJ_NEUTRAL': string;
  };
  isLoadingAI: NoosphericPlayerId | null;
  activePlayer: NoosphericPlayerId;
  gameState: NoosphericGameState;
}

const NODE_RADIUS = 3.0;
const KJ_NODE_RADIUS = 3.5;
const CN_NODE_RADIUS = 3.5;

const CONNECTION_COLOR = "rgba(100, 100, 120, 0.6)";
const CONNECTION_STROKE_WIDTH = "0.2";

const NODE_STROKE_WIDTH = 0.3;
const CN_STROKE_WIDTH = 0.5;
const KJ_STROKE_WIDTH = 0.5;

const REGION_NAME_FONT_SIZE = "2.2px";
const CN_KJ_TEXT_FONT_SIZE = "2.8px";
const NODE_TEXT_FONT_SIZE = "2.2px";
const UNIT_COUNT_FONT_SIZE = "2.6px";

const MIN_ZOOM_FACTOR = 0.3; 
const MAX_ZOOM_FACTOR = 3.0; 
const ZOOM_SENSITIVITY = 0.1;


const NoosphericMapDisplay: React.FC<NoosphericMapDisplayProps> = ({
  nodes,
  onNodeClick,
  selectedNodeId,
  factionColors,
  isLoadingAI,
  activePlayer,
  gameState,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState<string>("0 0 100 75");
  const initialViewBoxRef = useRef<string>("0 0 100 75");
  const isDraggingRef = useRef(false);
  const lastMousePositionRef = useRef<{ x: number; y: number } | null>(null);

  const calculateInitialViewBox = useCallback(() => {
    if (!nodes || nodes.length === 0) {
      return "0 0 100 75";
    }
    const dataPointsX = nodes.map(n => n.x);
    const dataPointsY = nodes.map(n => n.y);
    const minDataX = Math.min(...dataPointsX);
    const maxDataX = Math.max(...dataPointsX);
    const minDataY = Math.min(...dataPointsY);
    
    const labelOffset = parseFloat(REGION_NAME_FONT_SIZE.replace('px','')) * 0.9 + Math.max(KJ_NODE_RADIUS, CN_NODE_RADIUS);
    const maxDataYWithLabels = Math.max(...nodes.map(n => n.y + labelOffset));


    const PADDING_MULTIPLIER = 2.5; 
    const PADDING_CONTENT = Math.max(KJ_NODE_RADIUS, CN_NODE_RADIUS) * PADDING_MULTIPLIER;

    const vbX = minDataX - PADDING_CONTENT;
    const vbY = minDataY - PADDING_CONTENT;
    const contentWidthWithPadding = (maxDataX - minDataX) + 2 * PADDING_CONTENT;
    const contentHeightWithPadding = (maxDataYWithLabels - minDataY) + 2 * PADDING_CONTENT;
    
    const finalVBWidth = Math.max(contentWidthWithPadding, 100);
    const finalVBHeight = Math.max(contentHeightWithPadding, 75);
    return `${vbX} ${vbY} ${finalVBWidth} ${finalVBHeight}`;
  }, [nodes]);

  useEffect(() => {
    const newInitialVB = calculateInitialViewBox();
    setViewBox(newInitialVB);
    initialViewBoxRef.current = newInitialVB;
  }, [nodes, calculateInitialViewBox]);

  const attemptSetViewBox = (x: number, y: number, w: number, h: number) => {
    if (isFinite(x) && isFinite(y) && isFinite(w) && isFinite(h) && w > 0 && h > 0) {
      setViewBox(`${x} ${y} ${w} ${h}`);
    } else {
      console.warn("Attempted to set invalid viewBox:", { x, y, w, h }, "Resetting to initial view.");
      // Reset to initial or last known good viewBox if an invalid calculation occurs
      if (initialViewBoxRef.current && initialViewBoxRef.current.split(" ").map(Number).every(n => isFinite(n))) {
        const parts = initialViewBoxRef.current.split(" ").map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
          setViewBox(initialViewBoxRef.current);
        }
      }
    }
  };


  const handleMouseDown = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (event.button !== 0) return; 
    isDraggingRef.current = true;
    lastMousePositionRef.current = { x: event.clientX, y: event.clientY };
    if (svgRef.current) svgRef.current.style.cursor = 'grabbing';
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current || !lastMousePositionRef.current || !svgRef.current) return;

    const dx = event.clientX - lastMousePositionRef.current.x;
    const dy = event.clientY - lastMousePositionRef.current.y;

    const vbParts = viewBox.split(" ").map(Number);
    const currentX = vbParts[0];
    const currentY = vbParts[1];
    const currentWidth = vbParts[2];
    const currentHeight = vbParts[3];

    const clientRect = svgRef.current.getBoundingClientRect();
    if (clientRect.width === 0 || clientRect.height === 0) return; // Prevent division by zero

    const scaleX = currentWidth / clientRect.width;
    const scaleY = currentHeight / clientRect.height;

    const newX = currentX - dx * scaleX;
    const newY = currentY - dy * scaleY;

    attemptSetViewBox(newX, newY, currentWidth, currentHeight);
    lastMousePositionRef.current = { x: event.clientX, y: event.clientY };
  }, [viewBox]);

  const stopDragging = useCallback(() => {
    isDraggingRef.current = false;
    lastMousePositionRef.current = null;
    if (svgRef.current) svgRef.current.style.cursor = 'grab';
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    if (!svgRef.current) return;

    const vbParts = viewBox.split(" ").map(Number);
    let [currentX, currentY, currentWidth, currentHeight] = vbParts;
    
    const initialVBParts = initialViewBoxRef.current.split(" ").map(Number);
    const initialWidth = initialVBParts[2];

    const zoomFactor = event.deltaY < 0 ? 1 - ZOOM_SENSITIVITY : 1 + ZOOM_SENSITIVITY;
    let newWidth = currentWidth * zoomFactor;
    
    if (newWidth > initialWidth * MAX_ZOOM_FACTOR) newWidth = initialWidth * MAX_ZOOM_FACTOR; 
    if (newWidth < initialWidth * MIN_ZOOM_FACTOR) newWidth = initialWidth * MIN_ZOOM_FACTOR; 

    const newHeight = newWidth * (currentHeight / currentWidth); 

    const clientRect = svgRef.current.getBoundingClientRect();
    if (clientRect.width === 0 || clientRect.height === 0) return;

    const mouseX = event.clientX - clientRect.left;
    const mouseY = event.clientY - clientRect.top;

    const svgX = currentX + (mouseX / clientRect.width) * currentWidth;
    const svgY = currentY + (mouseY / clientRect.height) * currentHeight;

    const newX = svgX - (mouseX / clientRect.width) * newWidth;
    const newY = svgY - (mouseY / clientRect.height) * newHeight;
    
    attemptSetViewBox(newX, newY, newWidth, newHeight);
  }, [viewBox]);

  const handleZoomButton = (factor: number) => {
    const vbParts = viewBox.split(" ").map(Number);
    let [currentX, currentY, currentWidth, currentHeight] = vbParts;

    const initialVBParts = initialViewBoxRef.current.split(" ").map(Number);
    const initialWidth = initialVBParts[2];

    let newWidth = currentWidth * factor;
    if (newWidth > initialWidth * MAX_ZOOM_FACTOR) newWidth = initialWidth * MAX_ZOOM_FACTOR;
    if (newWidth < initialWidth * MIN_ZOOM_FACTOR) newWidth = initialWidth * MIN_ZOOM_FACTOR;
    
    const newHeight = newWidth * (currentHeight / currentWidth);

    const newX = currentX - (newWidth - currentWidth) / 2; 
    const newY = currentY - (newHeight - currentHeight) / 2;
    attemptSetViewBox(newX, newY, newWidth, newHeight);
  };

  const resetView = () => {
    const initialVBParts = initialViewBoxRef.current.split(" ").map(Number);
    attemptSetViewBox(initialVBParts[0], initialVBParts[1], initialVBParts[2], initialVBParts[3]);
  };

  if (!nodes || nodes.length === 0) {
    return <div className="text-center p-4">Loading map data...</div>;
  }
  
  return (
    <div className="w-full h-full relative flex flex-col">
      <svg
        ref={svgRef}
        preserveAspectRatio="xMidYMid meet"
        viewBox={viewBox}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        aria-labelledby="map-title"
        role="graphics-document"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging} 
        onWheel={handleWheel}
      >
        <title id="map-title">Noospheric Conquest Game Map</title>
        <defs>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {nodes.map(node =>
          node.connections.map(connId => {
            const targetNode = nodes.find(n => n.id === connId);
            if (targetNode && node.id < targetNode.id) {
              return (
                <line
                  key={`${node.id}-${connId}`}
                  x1={node.x}
                  y1={node.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke={CONNECTION_COLOR}
                  strokeWidth={CONNECTION_STROKE_WIDTH}
                />
              );
            }
            return null;
          })
        )}

        {nodes.map(node => {
          const isKJ = node.isKJ;
          const isCN = node.isCN;
          let radius = NODE_RADIUS;
          if (isKJ) radius = KJ_NODE_RADIUS;
          if (isCN) radius = CN_NODE_RADIUS;

          const effectiveOwner = node.owner;
          let nodeFillColor = "black";
          let strokeColor = factionColors['NEUTRAL'];
          let labelColorForOutline = factionColors['NEUTRAL'];

          if (effectiveOwner === 'GEM-Q') {
            strokeColor = factionColors['GEM-Q'];
            labelColorForOutline = factionColors['GEM-Q'];
          } else if (effectiveOwner === 'AXIOM') {
            strokeColor = factionColors['AXIOM'];
            labelColorForOutline = factionColors['AXIOM'];
          }
          
          if (isKJ && effectiveOwner === 'NEUTRAL') {
            strokeColor = factionColors['KJ_NEUTRAL'];
          } else if (isKJ && effectiveOwner !== 'NEUTRAL') {
            strokeColor = effectiveOwner === 'GEM-Q' ? factionColors['GEM-Q'] : factionColors['AXIOM'];
          }
          
          const isSelected = node.id === selectedNodeId;
          const isBlinking = isLoadingAI === effectiveOwner || (isLoadingAI === null && activePlayer === effectiveOwner && currentPhaseAllowsBlinking(gameState.currentPhase));
          const totalUnits = (node.standardUnits || 0) + (node.evolvedUnits || 0);
          const regionNameTextYOffset = radius + parseFloat(REGION_NAME_FONT_SIZE.replace('px','')) * 0.9;

          let internalTextFillColor = 'white';
          if (node.evolvedUnits > 0) {
              internalTextFillColor = (node.standardUnits === 0) ? '#d946ef' : '#a855f7';
          } else if (isKJ) {
              internalTextFillColor = factionColors['KJ_NEUTRAL'];
          } else if (node.owner !== 'NEUTRAL') {
              internalTextFillColor = effectiveOwner === 'GEM-Q' ? factionColors['GEM-Q'] : factionColors['AXIOM'];
          }
          
          return (
            <g
              key={node.id}
              onClick={() => onNodeClick(node.id)}
              className="cursor-pointer group focus:outline-none"
              role="button"
              aria-label={`Node ${node.label}, ${node.regionName}, Owner: ${node.owner}, Standard Units: ${node.standardUnits}, Evolved Units: ${node.evolvedUnits}`}
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && onNodeClick(node.id)}
            >
              {node.isHubActive && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius + 0.6}
                  fill="none"
                  stroke={effectiveOwner === 'GEM-Q' ? factionColors['GEM-Q'] : effectiveOwner === 'AXIOM' ? factionColors['AXIOM'] : factionColors['KJ_NEUTRAL']}
                  strokeWidth={0.3}
                  strokeDasharray="0.5 0.5"
                  className="animate-pulse opacity-80"
                  filter="url(#nodeGlow)"
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={nodeFillColor}
                stroke={isSelected ? "white" : strokeColor}
                strokeWidth={isKJ ? KJ_STROKE_WIDTH : isCN ? CN_STROKE_WIDTH : NODE_STROKE_WIDTH}
                className={`${isBlinking && !node.isHubActive ? 'animate-pulse opacity-70' : 'opacity-100'} group-hover:opacity-80 group-focus:opacity-80 transition-opacity duration-300`}
              />
              <text
                x={node.x}
                y={node.y - radius * 0.05}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={UNIT_COUNT_FONT_SIZE}
                fontWeight="bold"
                fill={internalTextFillColor}
                className="pointer-events-none select-none"
              >
                {totalUnits}
              </text>
              <text
                x={node.x}
                y={node.y + radius * 0.65}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={isKJ || isCN ? `${parseFloat(CN_KJ_TEXT_FONT_SIZE.replace('px','')) * 0.65}px` : `${parseFloat(NODE_TEXT_FONT_SIZE.replace('px','')) * 0.75}px`}
                fontWeight="bold"
                fill={node.isKJ ? factionColors['KJ_NEUTRAL'] : (node.owner !== 'NEUTRAL' ? (effectiveOwner === 'GEM-Q' ? factionColors['GEM-Q'] : factionColors['AXIOM']) : 'white')}
                className="pointer-events-none select-none opacity-80"
              >
                {node.label}
              </text>
              <text
                  x={node.x}
                  y={node.y + regionNameTextYOffset}
                  textAnchor="middle"
                  dominantBaseline="hanging"
                  fontSize={REGION_NAME_FONT_SIZE}
                  fill={labelColorForOutline}
                  className="pointer-events-none select-none group-hover:font-semibold"
              >
                  {node.regionName}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-2 right-2 flex flex-col space-y-1 z-10">
        <button onClick={() => handleZoomButton(1 - ZOOM_SENSITIVITY * 2)} className="p-1.5 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent shadow-md" title="Zoom In">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        </button>
        <button onClick={() => handleZoomButton(1 + ZOOM_SENSITIVITY * 2)} className="p-1.5 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent shadow-md" title="Zoom Out">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>
        </button>
        <button onClick={resetView} className="p-1.5 bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)] focus-ring-accent shadow-md" title="Reset View">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
        </button>
      </div>
    </div>
  );
};

const currentPhaseAllowsBlinking = (phase: NoosphericPhase) => {
    return phase === 'MANEUVER' || phase === 'COMBAT';
};

export default NoosphericMapDisplay;
