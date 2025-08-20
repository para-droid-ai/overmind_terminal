
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChimeraMapData, ChimeraMapNode } from '../../types'; 

interface ChimeraMapDisplayProps {
  mapData: ChimeraMapData | null;
  currentNodeId: string | null;
  onNodeClick?: (nodeId: string) => void;
}

const NODE_RADIUS_CHIMERA = 4; 
const CONNECTION_COLOR_CHIMERA = "rgba(100, 120, 180, 0.6)";
const CONNECTION_STROKE_WIDTH_CHIMERA = "0.25";
const NODE_TEXT_COLOR = "var(--color-accent-300)";
const CURRENT_NODE_HIGHLIGHT_COLOR = "var(--color-primary-500)";
const NODE_STROKE_COLOR = "var(--color-border-strong)";
const NODE_FILL_COLOR_DEFAULT = "rgba(40, 40, 70, 0.8)"; 
const NODE_FILL_COLOR_START = "rgba(60, 160, 60, 0.8)"; 
const NODE_FILL_COLOR_EXIT = "rgba(160, 60, 60, 0.8)"; 
const GRID_LINE_COLOR = "rgba(100, 100, 120, 0.15)";
const MIN_ZOOM = 0.5; // Max zoom out factor (e.g., viewBox width is 2x original)
const MAX_ZOOM = 3;  // Max zoom in factor (e.g., viewBox width is 0.33x original)


const ChimeraMapDisplay: React.FC<ChimeraMapDisplayProps> = ({ mapData, currentNodeId, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState<string>("0 0 100 75"); // Default initial
  const initialViewBoxRef = useRef<string>("0 0 100 75");

  useEffect(() => {
    if (mapData && mapData.nodes && Object.keys(mapData.nodes).length > 0) {
      const nodes = Object.values(mapData.nodes);
      const dataPointsX = nodes.map(n => n.x);
      const dataPointsY = nodes.map(n => n.y);
      const minDataX = Math.min(...dataPointsX, 0);
      const maxDataX = Math.max(...dataPointsX, 100);
      const minDataY = Math.min(...dataPointsY, 0);
      const maxDataY = Math.max(...dataPointsY, 75);

      const PADDING_CONTENT = NODE_RADIUS_CHIMERA * 2.5;
      const vbX = minDataX - PADDING_CONTENT;
      const vbY = minDataY - PADDING_CONTENT;
      const contentWidth = (maxDataX - minDataX);
      const contentHeight = (maxDataY - minDataY);
      const vbW = Math.max(contentWidth + 2 * PADDING_CONTENT, 100);
      const vbH = Math.max(contentHeight + 2 * PADDING_CONTENT, 75);
      
      const newInitialVB = `${vbX} ${vbY} ${vbW} ${vbH}`;
      setViewBox(newInitialVB);
      initialViewBoxRef.current = newInitialVB;
    }
  }, [mapData]);

  const handleZoom = useCallback((factor: number) => {
    const vbParts = viewBox.split(" ").map(Number);
    const [currentX, currentY, currentWidth, currentHeight] = vbParts;
    const initialVBParts = initialViewBoxRef.current.split(" ").map(Number);
    const initialWidth = initialVBParts[2];
    
    let newWidth = currentWidth * factor;
    
    // Enforce zoom limits relative to initial map scale
    if (newWidth > initialWidth * MAX_ZOOM) newWidth = initialWidth * MAX_ZOOM; // Max zoom out
    if (newWidth < initialWidth / MAX_ZOOM) newWidth = initialWidth / MAX_ZOOM; // Max zoom in (was MIN_ZOOM)

    const newHeight = newWidth * (currentHeight / currentWidth); // Maintain aspect ratio
    
    const newX = currentX - (newWidth - currentWidth) / 2;
    const newY = currentY - (newHeight - currentHeight) / 2;
    
    setViewBox(`${newX} ${newY} ${newWidth} ${newHeight}`);
  }, [viewBox]);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9; // Zoom out or in
      handleZoom(zoomFactor);
    };

    svgElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      svgElement.removeEventListener('wheel', handleWheel);
    };
  }, [handleZoom]);


  if (!mapData || !mapData.nodes || Object.keys(mapData.nodes).length === 0) {
    return (
      <div className="w-full h-full bg-[var(--color-bg-terminal)] flex items-center justify-center text-[var(--color-text-muted)] border-2 border-[var(--color-border-strong)] rounded-md">
        <p className="animate-pulse">No Tactical Map Data Loaded...</p>
      </div>
    );
  }
  
  const currentViewBoxParts = viewBox.split(" ").map(Number);
  const viewBoxX = currentViewBoxParts[0];
  const viewBoxY = currentViewBoxParts[1];
  const finalViewBoxWidth = currentViewBoxParts[2];
  const finalViewBoxHeight = currentViewBoxParts[3];
  const gridSpacing = 10;
  const nodes: ChimeraMapNode[] = Object.values(mapData.nodes);

  return (
    <div className="w-full h-full p-1 bg-black border-2 border-[var(--color-border-base)] rounded-md overflow-hidden flex flex-col">
      <div className="relative flex-grow overflow-hidden">
        <svg
          ref={svgRef}
          preserveAspectRatio="xMidYMid meet"
          viewBox={viewBox}
          className="w-full h-full cursor-default" // Add grab/grabbing cursor if pan is implemented
          aria-labelledby="chimera-map-title"
          role="graphics-document"
        >
          <title id="chimera-map-title">{mapData.name || "Chimera Sector Map"}</title>
          
          <defs>
            <filter id="chimeraNodeGlowCurrent" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <g id="map-grid">
            {Array.from({ length: Math.ceil(finalViewBoxWidth / gridSpacing) + 10 }).map((_, i) => ( // Extend grid lines
              <line
                key={`grid-v-${i}`}
                x1={viewBoxX - (5*gridSpacing) + i * gridSpacing}
                y1={viewBoxY - (5*gridSpacing)}
                x2={viewBoxX - (5*gridSpacing) + i * gridSpacing}
                y2={viewBoxY + finalViewBoxHeight + (5*gridSpacing)}
                stroke={GRID_LINE_COLOR}
                strokeWidth="0.1"
              />
            ))}
            {Array.from({ length: Math.ceil(finalViewBoxHeight / gridSpacing) + 10 }).map((_, i) => (
              <line
                key={`grid-h-${i}`}
                x1={viewBoxX - (5*gridSpacing)}
                y1={viewBoxY - (5*gridSpacing) + i * gridSpacing}
                x2={viewBoxX + finalViewBoxWidth + (5*gridSpacing)}
                y2={viewBoxY - (5*gridSpacing) + i * gridSpacing}
                stroke={GRID_LINE_COLOR}
                strokeWidth="0.1"
              />
            ))}
          </g>

          {nodes.map((node: ChimeraMapNode) =>
            node.connections.map(connId => {
              const targetNode = mapData.nodes[connId];
              if (targetNode && node.id < targetNode.id) { 
                return (
                  <line
                    key={`${node.id}-${connId}`}
                    x1={node.x}
                    y1={node.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke={CONNECTION_COLOR_CHIMERA}
                    strokeWidth={CONNECTION_STROKE_WIDTH_CHIMERA}
                    opacity="0.6"
                  />
                );
              }
              return null;
            })
          )}

          {nodes.map((node: ChimeraMapNode) => {
            let fill = NODE_FILL_COLOR_DEFAULT;
            if (node.isStartNode) fill = NODE_FILL_COLOR_START;
            if (node.isExitNode) fill = NODE_FILL_COLOR_EXIT;
            const isCurrent = node.id === currentNodeId;

            return (
              <g
                key={node.id}
                className={onNodeClick ? "cursor-pointer group chimera-map-node" : "cursor-default chimera-map-node"}
                onClick={() => onNodeClick && onNodeClick(node.id)}
                role={onNodeClick ? "button" : undefined}
                aria-label={onNodeClick ? `Node ${node.name}: ${node.description}` : undefined}
                tabIndex={onNodeClick ? 0 : undefined}
                onKeyPress={onNodeClick ? (e) => e.key === 'Enter' && onNodeClick(node.id) : undefined}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={NODE_RADIUS_CHIMERA}
                  fill={fill}
                  stroke={isCurrent ? CURRENT_NODE_HIGHLIGHT_COLOR : NODE_STROKE_COLOR}
                  strokeWidth={isCurrent ? 0.7 : 0.35}
                  className={isCurrent ? "animate-pulse" : ""}
                  filter={isCurrent ? "url(#chimeraNodeGlowCurrent)" : undefined}
                />
                <text
                  x={node.x}
                  y={node.y + NODE_RADIUS_CHIMERA + 2.5} 
                  textAnchor="middle"
                  fontSize="2.2px" 
                  fill={NODE_TEXT_COLOR}
                  className="pointer-events-none select-none font-semibold"
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth="0.1px"
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
       <div className="flex-shrink-0 p-1 flex justify-center items-center space-x-2 bg-black bg-opacity-30 border-t border-[var(--color-border-base)]">
        <button 
            onClick={() => handleZoom(0.8)} 
            className="px-2 py-0.5 text-xs bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)]"
            title="Zoom In (+)"
        >
            Zoom In (+)
        </button>
        <button 
            onClick={() => handleZoom(1.25)} 
            className="px-2 py-0.5 text-xs bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)]"
            title="Zoom Out (-)"
        >
            Zoom Out (-)
        </button>
         <button 
            onClick={() => setViewBox(initialViewBoxRef.current)} 
            className="px-2 py-0.5 text-xs bg-[var(--color-bg-button-secondary)] text-[var(--color-text-button-secondary)] rounded hover:bg-[var(--color-bg-button-secondary-hover)]"
            title="Reset Zoom"
        >
            Reset View
        </button>
      </div>
    </div>
  );
};

export default ChimeraMapDisplay;
