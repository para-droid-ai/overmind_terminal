
import React, { useState, useRef } from 'react';
import { NoosphericGameState, NoosphericNodeData, NoosphericPlayerId, ThemeName, SystemLogEntry, BattleLogEntry } from '../../types'; 
import { AI1_NAME, AI2_NAME, THEMES } from '../../constants'; 

interface NoosphericSidebarProps {
  gameState: NoosphericGameState;
  selectedNodeId: string | null;
  isLoadingAI: NoosphericPlayerId | null;
  onOpenInfoModal: () => void;
  activeTheme?: ThemeName; 
  isGameStarted: boolean; 
  currentPhaseTimeDisplay: string;
  averageFullTurnTimeDisplay: string;
  lastAiProcessingTimeDisplay: string;
  totalGameTimeDisplay: string;
  formatDuration: (ms: number) => string;
}

const MINIMAP_SIZE = 150; 
const NODE_MINIMAP_RADIUS = 1.8;
const MINIMAP_CONNECTION_COLOR = "rgba(128, 128, 140, 0.7)"; 
const MINIMAP_CONNECTION_STROKE_WIDTH = "0.4"; 

const formatLogTimestamp = (isoTimestamp: string): string => {
  const date = new Date(isoTimestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
};

const getSystemLogPrefixAndContext = (entry: SystemLogEntry, forClipboard: boolean = false): string => {
  const { type, source, turn: entryTurn, phase: entryPhase, message, timestamp } = entry;
  let prefix = "";
  let mainColorClass = "text-[var(--color-text-muted)]";
  let context = "";
  const formattedTime = formatLogTimestamp(timestamp);

  const phaseDisplay = String(entryPhase).substring(0,4);

  if (forClipboard) {
    prefix = `${formattedTime} [Turn ${entryTurn}, ${phaseDisplay}] ${source ? source + ' ' : ''}(${type}): `;
    return prefix + message;
  }

  if (type === 'ERROR') {
    prefix = `<span class="text-[var(--color-error)] mr-1">[!]</span>`;
    mainColorClass = "text-[var(--color-error)]";
  } else if (source === 'GEM-Q' && type === 'AI_ACTION') {
    prefix = `<span class="text-[var(--color-ai1-text)] mr-1">♦</span>`;
    mainColorClass = "text-[var(--color-ai1-text)] opacity-90";
  } else if (source === 'AXIOM' && type === 'AI_ACTION') {
    prefix = `<span class="text-[var(--color-ai2-text)] mr-1">▲</span>`;
    mainColorClass = "text-[var(--color-ai2-text)] opacity-90";
  } else if (type === 'EVENT') {
    prefix = `<span class="text-[var(--color-system-message)] mr-1">§</span>`;
    mainColorClass = "text-[var(--color-system-message)]";
  } else { 
    prefix = `<span class="text-[var(--color-info)] mr-1">(i)</span>`;
     mainColorClass = "text-[var(--color-text-muted)]"; 
  }

  if ((type === 'AI_ACTION' && source) || type === 'EVENT' || type === 'INFO') { // Always show context for INFO too
      context = ` <span class="opacity-60 text-[0.9em]">[T${entryTurn}, ${phaseDisplay}]</span> `;
  }
  
  return `<span class="${mainColorClass}"><span class="text-gray-500 text-xs mr-1.5">${formattedTime}</span>${prefix}${context}${message}</span>`;
};


const isNodeConnectedToFactionCN = (nodeId: string, factionId: NoosphericPlayerId, mapNodes: Record<string, NoosphericNodeData>): boolean => {
    if (!mapNodes[nodeId] || mapNodes[nodeId].owner !== factionId) return false;
    const queue: string[] = [nodeId];
    const visited: Set<string> = new Set([nodeId]);
    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const currentNode = mapNodes[currentId];
        if (!currentNode || currentNode.owner !== factionId) continue;
        if (currentNode.isCN) return true;
        for (const neighborId of currentNode.connections) {
            const neighborNode = mapNodes[neighborId];
            if (neighborNode && neighborNode.owner === factionId && !visited.has(neighborId)) {
                visited.add(neighborId);
                queue.push(neighborId);
            }
        }
    }
    return false;
};


const NoosphericSidebar: React.FC<NoosphericSidebarProps> = ({ 
    gameState, selectedNodeId, isLoadingAI, onOpenInfoModal, activeTheme = 'noosphericDark', isGameStarted, currentPhaseTimeDisplay, averageFullTurnTimeDisplay, lastAiProcessingTimeDisplay, totalGameTimeDisplay, formatDuration
}) => {
  const { turn, currentPhase, activePlayer, factions, systemLog, battleLog, mapNodes, winner } = gameState;
  const [logCopied, setLogCopied] = useState(false);
  const [expandedLogPanel, setExpandedLogPanel] = useState<'system' | 'battle' | null>(null);


  const selectedNodeDetails = selectedNodeId ? mapNodes[selectedNodeId] : null;
  const totalUnitsOnSelectedNode = selectedNodeDetails ? (selectedNodeDetails.standardUnits || 0) + (selectedNodeDetails.evolvedUnits || 0) : 0;

  const PADDING_MINIMAP = NODE_MINIMAP_RADIUS * 2.5;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const nodeValues = Object.values(mapNodes);
  if (nodeValues.length > 0) {
    nodeValues.forEach(n => {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x);
        maxY = Math.max(maxY, n.y);
    });
  } else { 
    minX = 0; minY = 0; maxX = 100; maxY = 100; 
  }

  const mapWidth = Math.max(1, maxX - minX); 
  const mapHeight = Math.max(1, maxY - minY);
  const scaleX = (MINIMAP_SIZE - 2 * PADDING_MINIMAP) / mapWidth;
  const scaleY = (MINIMAP_SIZE - 2 * PADDING_MINIMAP) / mapHeight;
  const scale = Math.min(scaleX, scaleY);

  const factionColors = {
    'GEM-Q': THEMES[activeTheme]?.ai1TextColor || '#ef4444',
    'AXIOM': THEMES[activeTheme]?.ai2TextColor || '#22d3ee',
    'NEUTRAL': '#6b7280', 
    'KJ_NEUTRAL': THEMES[activeTheme]?.neutralKJColor || '#eab308',
  };

  const handleCopySystemLog = async () => {
    const logText = systemLog.map(entry => getSystemLogPrefixAndContext(entry, true)).join('\n');
    try {
      await navigator.clipboard.writeText(logText);
      setLogCopied(true);
      setTimeout(() => setLogCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy system log: ', err);
    }
  };

  const renderFactionPanel = (factionId: 'GEM-Q' | 'AXIOM') => {
    const faction = factions[factionId];
    const isFactionLoading = isLoadingAI === factionId;
    const isFactionActive = isGameStarted && activePlayer === factionId && (currentPhase === 'MANEUVER' || currentPhase === 'COMBAT') && !winner; 
    const borderColorClass = factionId === 'GEM-Q' ? 'border-[var(--color-ai1-text)]' : 'border-[var(--color-ai2-text)]';
    
    let totalQROutputThisTurn = 0;
    if (isGameStarted) {
        Object.values(mapNodes).forEach(node => {
            if (node.owner === factionId && isNodeConnectedToFactionCN(node.id, factionId, mapNodes)) {
                totalQROutputThisTurn += node.qrOutput;
            }
        });
    }
    
    return (
      <div className={`p-2.5 rounded border-2 ${borderColorClass} ${isFactionLoading && !faction.aiError ? 'animate-pulse' : ''} bg-[var(--color-bg-terminal)] bg-opacity-50 flex flex-col`}>
        <h3 className={`text-md font-semibold mb-1 ${factionId === 'GEM-Q' ? 'text-[var(--color-ai1-text)]' : 'text-[var(--color-ai2-text)]'}`}>
          {faction.name} {isFactionLoading && !faction.aiError ? '(Thinking...)' : isFactionActive ? '(Active)' : ''}
        </h3>
        <div className="grid grid-cols-2 gap-x-2 text-xs mb-0.5">
            <div> 
                <p>QR: <span className="font-bold text-[var(--color-text-heading)]">{faction.qr}</span></p>
                <p>Nodes: <span className="font-bold text-[var(--color-text-heading)]">{faction.nodesControlled}</span></p>
                <p>KJs Held: <span className="font-bold text-[var(--color-text-heading)]">{faction.kjsHeld}</span></p>
                <p>QR/Turn: <span className="font-bold text-green-400">{totalQROutputThisTurn}</span></p>
            </div>
            <div> 
                <p>Total Units: <span className="font-bold text-[var(--color-text-heading)]">{faction.totalUnits}</span></p>
                <p>Std Units: <span className="font-bold text-[var(--color-text-base)]">{faction.totalStandardUnits}</span></p>
                <p>Evl Units: <span className="font-bold text-purple-400">{faction.totalEvolvedUnits}</span></p>
                <p>Hubs Active: <span className="font-bold text-cyan-400">{faction.activeHubsCount}</span></p>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-x-2 text-xs mb-0.5">
             <p>Attacks Won: <span className="font-bold text-green-400">{faction.successfulAttacks}</span></p>
             <p>Attacks Lost: <span className="font-bold text-red-400">{faction.attacksLost}</span></p>
        </div>
        <div className="grid grid-cols-2 gap-x-2 text-xs mb-0.5">
             <p>Defenses Won: <span className="font-bold text-sky-400">{faction.successfulDefenses}</span></p>
             <p>Defenses Lost: <span className="font-bold text-orange-400">{faction.defensesLost}</span></p>
        </div>
        <div className="grid grid-cols-2 gap-x-2 text-xs"> 
             <p>Units Purchased: <span className="font-bold text-yellow-400">{faction.unitsPurchased || 0}</span></p>
             <p>Units Lost: <span className="font-bold text-red-500">{faction.unitsLost || 0}</span></p>
        </div>
      </div>
    );
  };

  const renderSystemLogPanel = (isExpandedView: boolean) => (
    <div className={`p-2.5 flex flex-col bg-[var(--color-bg-terminal)] bg-opacity-50 ${isExpandedView ? 'h-full rounded-md' : 'rounded-b-md md:rounded-b-none h-1/2 flex flex-col overflow-hidden min-h-0'}`}>
      <div className="flex justify-between items-center mb-1 flex-shrink-0">
        <h4 className="text-sm font-semibold text-[var(--color-text-heading)]">
          System Log {isExpandedView ? '(Expanded)' : ''}
        </h4>
        <div className="flex items-center">
          {logCopied && <span className="text-xs text-[var(--color-system-message)] mr-2">Copied!</span>}
          <button onClick={handleCopySystemLog} title="Copy System Log" className="p-0.5 hover:bg-[var(--color-bg-button-secondary-hover)] rounded text-[var(--color-text-muted)] mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </button>
          <button 
            onClick={() => setExpandedLogPanel(isExpandedView ? null : 'system')} 
            title={isExpandedView ? "Close Log" : "Expand Log"} 
            className="p-0.5 hover:bg-[var(--color-bg-button-secondary-hover)] rounded text-[var(--color-text-muted)]"
          >
            {isExpandedView ? 
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> : 
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" /></svg>
            }
          </button>
        </div>
      </div>
      <ul className="text-xs space-y-0.5 overflow-y-auto flex-grow log-display pr-1 custom-scrollbar min-h-0">
        {systemLog.length === 0 && <li className="italic text-[var(--color-text-muted)]">No system events.</li>}
        {systemLog.slice().reverse().map(entry => (
          <li key={entry.id} className="leading-snug" dangerouslySetInnerHTML={{ __html: getSystemLogPrefixAndContext(entry) }} />
        ))}
      </ul>
    </div>
  );

  const renderBattleLogPanel = (isExpandedView: boolean) => (
    <div className={`p-2.5 flex flex-col bg-[var(--color-bg-terminal)] bg-opacity-50 ${isExpandedView ? 'h-full rounded-md' : 'rounded-b-md h-1/2 flex flex-col overflow-hidden min-h-0'}`}>
      <div className="flex justify-between items-center mb-1 flex-shrink-0">
        <h4 className="text-sm font-semibold text-[var(--color-text-heading)]">
          Battle History {isExpandedView ? '(Expanded)' : '(Last 5)'}
        </h4>
        <div className="flex items-center">
          <button 
            onClick={() => setExpandedLogPanel(isExpandedView ? null : 'battle')} 
            title={isExpandedView ? "Close Log" : "Expand Log"} 
            className="p-0.5 hover:bg-[var(--color-bg-button-secondary-hover)] rounded text-[var(--color-text-muted)]"
          >
            {isExpandedView ? 
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> : 
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" /></svg>
            }
          </button>
        </div>
      </div>
      <ul className="text-xs space-y-1 overflow-y-auto flex-grow log-display pr-1 custom-scrollbar min-h-0">
        {battleLog.length === 0 && <li className="italic text-[var(--color-text-muted)]">No battles recorded yet.</li>}
        {(isExpandedView ? battleLog : battleLog.slice(-5)).slice().reverse().map(entry => (
          <li key={entry.id} className="border-t border-dashed border-[var(--color-border-strong)] pt-1">
            <p>T{entry.turn}: {mapNodes[entry.nodeId]?.label || entry.nodeId} ({mapNodes[entry.nodeId]?.regionName || 'Unknown Region'})</p>
            <p><span className={entry.attacker === 'GEM-Q' ? 'text-[var(--color-ai1-text)]' : 'text-[var(--color-ai2-text)]'}>{entry.attacker}</span> vs <span className={entry.defender === 'GEM-Q' ? 'text-[var(--color-ai1-text)]' : entry.defender === 'AXIOM' ? 'text-[var(--color-ai2-text)]' : 'text-[var(--color-text-muted)]'}>{entry.defender}</span></p>
            <p>Outcome: <span className={entry.outcome.includes("ATTACKER") ? 'text-[var(--color-system-message)]' : 'text-[var(--color-info)]'}>{entry.outcome.replace('_', ' ')}{entry.nodeCaptured ? ' (Node Captured)' : ''}</span></p>
            <p>Losses A/D: {entry.attackerLosses}/{entry.defenderLosses}</p>
          </li>
        ))}
      </ul>
    </div>
  );
  
  return (
    <aside className="w-full md:w-1/3 lg:w-[320px] flex flex-col gap-2 p-1 bg-[var(--color-bg-panel)] rounded-md shadow-lg overflow-hidden">
      {expandedLogPanel === 'system' ? (
        renderSystemLogPanel(true)
      ) : expandedLogPanel === 'battle' ? (
        renderBattleLogPanel(true)
      ) : (
        <>
          {/* Turn Info Panel */}
          <div className="p-2.5 border-b-2 border-[var(--color-border-strong)] flex-shrink-0 bg-[var(--color-bg-terminal)] bg-opacity-50 rounded-t-md">
            {isGameStarted ? (
              <>
                <div className="flex justify-between items-start">
                  <div className="flex-grow">
                    <p className="text-sm font-semibold">
                      Turn: <span className="text-[var(--color-text-heading)]">{turn}</span>
                      {gameState.currentPhase !== 'GAME_OVER' &&
                        <span className={`ml-1 ${activePlayer === 'GEM-Q' ? 'text-[var(--color-ai1-text)]' : 'text-[var(--color-ai2-text)]'}`}>
                          ({activePlayer === 'GEM-Q' ? AI1_NAME : AI2_NAME})
                        </span>
                      }
                    </p>
                    <p className="text-sm">Phase: <span className="text-[var(--color-accent-300)] font-semibold">{currentPhase}</span></p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Total Game Time: {totalGameTimeDisplay}</p>
                  </div>
                  <div className="text-lg text-[var(--color-text-heading)] font-mono flex items-center flex-shrink-0 ml-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-1 opacity-80">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
                    </svg>
                    <span>{currentPhaseTimeDisplay}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-2 text-xs text-[var(--color-text-muted)] mt-1.5">
                  <p>Avg Turn: <span className="font-semibold">{averageFullTurnTimeDisplay}</span></p>
                  <p>Last AI: <span className="font-semibold">{lastAiProcessingTimeDisplay}</span></p>
                </div>
                {(winner || gameState.currentPhase === 'GAME_OVER') &&
                  <p className="text-md font-bold mt-1.5 text-center" style={{ color: winner === 'GEM-Q' ? factionColors['GEM-Q'] : winner === 'AXIOM' ? factionColors['AXIOM'] : factionColors.NEUTRAL }}>
                    {
                      winner === 'DRAW' ? 'Game is a DRAW!' :
                      winner === 'GEM-Q' ? `${AI1_NAME} WINS!` :
                      winner === 'AXIOM' ? `${AI2_NAME} WINS!` :
                      winner === 'NEUTRAL' ? 'Neutral Outcome' :
                      'Game Over'
                    }
                  </p>
                }
              </>
            ) : (
              <p className="text-sm font-semibold text-center text-[var(--color-text-muted)]">Game Not Started</p>
            )}
          </div>

          {/* Minimap or Node Details Panel */}
          <div className="p-2.5 border-b-2 border-[var(--color-border-strong)] h-[210px] flex-shrink-0 flex flex-col bg-[var(--color-bg-terminal)] bg-opacity-50">
            {selectedNodeDetails ? (
              <>
                <h4 className="text-sm font-semibold text-[var(--color-text-heading)] mb-1 flex-shrink-0 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1.5 text-[var(--color-accent-400)]">
                        <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 1.039.574c.01.005.021.009.032.012a3.012 3.012 0 0 0 .122.047c.033.01.065.019.096.026l.003.001Z" clipRule="evenodd" />
                        <path d="M10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />
                    </svg>
                    Node Info: {selectedNodeDetails.regionName} ({selectedNodeDetails.label || selectedNodeDetails.id})
                </h4>
                <div className="text-xs space-y-0.5 overflow-y-auto log-display pr-1 flex-grow custom-scrollbar">
                    <p>Type: <span className="font-semibold">{selectedNodeDetails.isCN ? 'CN' : selectedNodeDetails.isKJ ? 'KJ' : 'QN'}</span></p>
                    <p>Owner: <span className={`font-bold ${selectedNodeDetails.owner === 'GEM-Q' ? 'text-[var(--color-ai1-text)]' : selectedNodeDetails.owner === 'AXIOM' ? 'text-[var(--color-ai2-text)]' : 'text-[var(--color-text-muted)]'}`}>{mapNodes[selectedNodeDetails.id]?.owner || 'Unknown'}</span></p>
                    <p>QR/Turn: <span className="font-semibold">{selectedNodeDetails.qrOutput}</span></p>
                    {selectedNodeDetails.hasFabricationHub && (
                      <>
                        <p>Fab. Hub: <span className={`font-semibold ${selectedNodeDetails.isHubActive ? 'text-green-400' : 'text-yellow-400'}`}>
                          {selectedNodeDetails.isHubActive ? 'Active' : 'Inactive'}
                          {selectedNodeDetails.hubDisconnectedTurn && !selectedNodeDetails.isHubActive && ` (Disconnected - Grace Turn: ${selectedNodeDetails.hubDisconnectedTurn})`}
                          {selectedNodeDetails.hubDisconnectedTurn && selectedNodeDetails.isHubActive && ` (Grace Period Active - Disconnected Turn: ${selectedNodeDetails.hubDisconnectedTurn})`}
                        </span></p>
                      </>
                    )}
                    {!selectedNodeDetails.hasFabricationHub && (
                        <p>Fab. Hub: <span className="font-semibold text-[var(--color-text-muted)]">N/A</span></p>
                    )}
                    <hr className="border-[var(--color-border-strong)] opacity-30 my-1.5"/>
                    <p className="font-semibold text-[var(--color-text-heading)]">Units Present ({totalUnitsOnSelectedNode}):</p>
                    <p>Standard: <span className="font-bold">{selectedNodeDetails.standardUnits || 0}</span></p>
                    <p>Evolved: <span className="font-bold text-purple-400">{selectedNodeDetails.evolvedUnits || 0}</span></p>
                    <p className="mt-1">Max Units: {selectedNodeDetails.maxUnits || 'N/A'}</p>
                    <p>Connections: {selectedNodeDetails.connections.map(id => mapNodes[id]?.label || id).join(', ')}</p>
                </div>
              </>
            ) : (
              <>
                <h4 className="text-sm font-semibold text-[var(--color-text-heading)] mb-1 text-center flex-shrink-0">Minimap</h4>
                <div className="flex justify-center items-center flex-grow my-1">
                    <svg width={MINIMAP_SIZE} height={MINIMAP_SIZE} viewBox={`0 0 ${MINIMAP_SIZE} ${MINIMAP_SIZE}`} className="bg-black border border-[var(--color-border-base)] rounded">
                    {nodeValues.map(node =>
                        node.connections.map(connId => {
                        const targetNode = nodeValues.find(n => n.id === connId);
                        if (targetNode && node.id < targetNode.id) { 
                            const x1 = ((node.x - minX) * scale) + PADDING_MINIMAP;
                            const y1 = ((node.y - minY) * scale) + PADDING_MINIMAP;
                            const x2 = ((targetNode.x - minX) * scale) + PADDING_MINIMAP;
                            const y2 = ((targetNode.y - minY) * scale) + PADDING_MINIMAP;
                            return (
                            <line 
                                key={`mini-conn-${node.id}-${connId}`} 
                                x1={x1} y1={y1} x2={x2} y2={y2} 
                                stroke={MINIMAP_CONNECTION_COLOR} 
                                strokeWidth={MINIMAP_CONNECTION_STROKE_WIDTH}
                            />
                            );
                        }
                        return null;
                        })
                    )}
                    {nodeValues.map(node => {
                        const cx = ((node.x - minX) * scale) + PADDING_MINIMAP;
                        const cy = ((node.y - minY) * scale) + PADDING_MINIMAP;
                        let color = factionColors[node.owner] || factionColors['NEUTRAL'];
                        if (node.isKJ && node.owner === 'NEUTRAL') color = factionColors['KJ_NEUTRAL'];
                        else if (node.isKJ) color = factionColors[node.owner] || factionColors['KJ_NEUTRAL']; 
                        return ( <circle key={`mini-${node.id}`} cx={cx} cy={cy} r={NODE_MINIMAP_RADIUS * (node.isCN || node.isKJ ? 1.5 : 1) } fill={color} /> );
                    })}
                    </svg>
                </div>
                <p className="text-xs text-center mt-1 text-[var(--color-text-muted)] flex-shrink-0">Click on a map node to view details.</p>
              </>
            )}
          </div>
          
          <div className="grid grid-cols-1 gap-2 p-2.5 border-b-2 border-[var(--color-border-strong)] flex-shrink-0">
            {renderFactionPanel('GEM-Q')}
            {renderFactionPanel('AXIOM')}
          </div>

          <div className="flex-grow flex flex-col min-h-0 gap-2 overflow-hidden">
            {renderSystemLogPanel(false)}
            {renderBattleLogPanel(false)}
          </div>
        </>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: var(--color-scrollbar-track); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--color-scrollbar-thumb); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-scrollbar-thumb-hover); }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: var(--color-scrollbar-thumb) var(--color-scrollbar-track); }
      `}</style>
    </aside>
  );
};

export default NoosphericSidebar;
