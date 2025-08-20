
import { NoosphericNodeData, NoosphericFaction, NoosphericPlayerId, NoosphericMapType } from '../types';
import { AI1_NAME, AI2_NAME } from '../constants';

// Interface for the raw map definitions for clarity and type safety
interface NCMapNodeDefinition {
  id: string;
  name: string;
  type: 'CN' | 'QN' | 'KJ';
  connections: string[];
  resourcesPerTurn: number;
  hasFabricationHub: boolean; 
  mapPosition: { x: number; y: number };
}

interface NCMapDefinition {
  name: NoosphericMapType;
  ai1StartNodeId: string; 
  ai1InitialControlledNodes: string[];
  ai2StartNodeId: string; 
  ai2InitialControlledNodes: string[];
  neutralKJsWithUnits: string[];
  nodes: NCMapNodeDefinition[];
}

// --- Data for Seraphim Grid (from user's current prompt file) ---
const seraphimGridUserInput = {
  "id": "seraphim_grid_map_def_from_user",
  "name": "The Seraphim Grid" as NoosphericMapType,
  "nodes_input": [
    { "id": "A-CN", "name": "Alpha Core", "pos": { "x": 15, "y": 20 } },
    { "id": "A-1", "name": "A-Perimeter 1", "pos": { "x": 10, "y": 30 } },
    { "id": "A-2", "name": "A-Perimeter 2", "pos": { "x": 20, "y": 30 } },
    { "id": "A-3", "name": "A-Relay", "pos": { "x": 15, "y": 40 } },
    { "id": "A-4", "name": "A-Gateway", "pos": { "x": 25, "y": 50 } },
    { "id": "B-CN", "name": "Beta Core", "pos": { "x": 85, "y": 80 } },
    { "id": "B-1", "name": "B-Perimeter 1", "pos": { "x": 90, "y": 70 } },
    { "id": "B-2", "name": "B-Perimeter 2", "pos": { "x": 80, "y": 70 } },
    { "id": "B-3", "name": "B-Relay", "pos": { "x": 85, "y": 60 } },
    { "id": "B-4", "name": "B-Gateway", "pos": { "x": 75, "y": 50 } },
    { "id": "G-KJ", "name": "Typhon Nexus", "pos": { "x": 50, "y": 50 } },
    { "id": "G-1", "name": "G-Node 1", "pos": { "x": 45, "y": 45 } },
    { "id": "G-2", "name": "G-Node 2", "pos": { "x": 55, "y": 45 } },
    { "id": "G-3", "name": "G-Node 3", "pos": { "x": 55, "y": 55 } },
    { "id": "G-4", "name": "G-Node 4", "pos": { "x": 45, "y": 55 } },
    { "id": "G-5", "name": "G-Firewall N", "pos": { "x": 50, "y": 35 } },
    { "id": "G-6", "name": "G-Firewall S", "pos": { "x": 50, "y": 65 } },
    { "id": "D-KJ", "name": "Orion Arm", "pos": { "x": 50, "y": 15 } },
    { "id": "D-1", "name": "D-Hub", "pos": { "x": 40, "y": 15 } },
    { "id": "D-2", "name": "D-Anchor", "pos": { "x": 60, "y": 15 } },
    { "id": "D-3", "name": "D-Echo 1", "pos": { "x": 45, "y": 5 } },
    { "id": "D-4", "name": "D-Echo 2", "pos": { "x": 55, "y": 5 } },
    { "id": "D-5", "name": "D-Deep Relay", "pos": { "x": 70, "y": 10 } },
    { "id": "D-6", "name": "D-Spur", "pos": { "x": 30, "y": 10 } },
    { "id": "E-KJ", "name": "Hydra Maw", "pos": { "x": 50, "y": 85 } },
    { "id": "E-1", "name": "E-Hub", "pos": { "x": 40, "y": 85 } },
    { "id": "E-2", "name": "E-Anchor", "pos": { "x": 60, "y": 85 } },
    { "id": "E-3", "name": "E-Echo 1", "pos": { "x": 45, "y": 95 } },
    { "id": "E-4", "name": "E-Echo 2", "pos": { "x": 55, "y": 95 } },
    { "id": "E-5", "name": "E-Deep Relay", "pos": { "x": 30, "y": 90 } },
    { "id": "E-6", "name": "E-Spur", "pos": { "x": 70, "y": 90 } },
    { "id": "OR-1", "name": "Void Anomaly", "pos": { "x": 5, "y": 5 } },
    { "id": "OR-2", "name": "Rogue Datastream", "pos": { "x": 95, "y": 5 } },
    { "id": "OR-3", "name": "Forgotten Archive", "pos": { "x": 5, "y": 95 } },
    { "id": "OR-4", "name": "Abyssal Node", "pos": { "x": 95, "y": 95 } }
  ],
  "connections_input": [
    ["A-CN", "A-1"], ["A-CN", "A-2"], ["A-1", "A-3"], ["A-2", "A-3"], ["A-3", "A-4"],
    ["B-CN", "B-1"], ["B-CN", "B-2"], ["B-1", "B-3"], ["B-2", "B-3"], ["B-3", "B-4"],
    ["G-KJ", "G-1"], ["G-KJ", "G-2"], ["G-KJ", "G-3"], ["G-KJ", "G-4"],
    ["G-1", "G-2"], ["G-2", "G-3"], ["G-3", "G-4"], ["G-4", "G-1"],
    ["G-1", "G-5"], ["G-2", "G-5"], ["G-3", "G-6"], ["G-4", "G-6"],
    ["D-KJ", "D-1"], ["D-KJ", "D-2"], ["D-1", "D-3"], ["D-2", "D-4"], ["D-3", "D-4"],
    ["D-1", "D-6"], ["D-2", "D-5"],
    ["E-KJ", "E-1"], ["E-KJ", "E-2"], ["E-1", "E-3"], ["E-2", "E-4"], ["E-3", "E-4"],
    ["E-1", "E-5"], ["E-2", "E-6"],
    ["A-4", "G-4"], ["A-4", "G-1"], 
    ["B-4", "G-2"], ["B-4", "G-3"], 
    ["G-5", "D-KJ"], 
    ["G-6", "E-KJ"], 
    ["D-6", "OR-1"], ["D-5", "OR-2"], 
    ["E-5", "OR-3"], ["E-6", "OR-4"], 
    ["A-1", "OR-1"], ["A-1", "OR-3"], 
    ["B-1", "OR-2"], ["B-1", "OR-4"] 
  ]
};

const seraphimGridNodes: NCMapNodeDefinition[] = seraphimGridUserInput.nodes_input.map(n => {
  const nodeType = n.id.includes('-CN') ? 'CN' : n.id.includes('-KJ') ? 'KJ' : 'QN';
  const nodeConnections = new Set<string>();
  seraphimGridUserInput.connections_input.forEach(conn => {
    if (conn[0] === n.id) nodeConnections.add(conn[1]);
    if (conn[1] === n.id) nodeConnections.add(conn[0]);
  });
  return {
    id: n.id,
    name: n.name,
    type: nodeType,
    connections: Array.from(nodeConnections),
    resourcesPerTurn: nodeType === 'CN' ? 3 : nodeType === 'KJ' ? 2 : 1,
    hasFabricationHub: nodeType === 'KJ', 
    mapPosition: { x: n.pos.x, y: n.pos.y },
  };
});

const seraphimGridMapDefinition: NCMapDefinition = {
  name: "The Seraphim Grid",
  ai1StartNodeId: "A-CN",
  ai1InitialControlledNodes: ["A-CN"], 
  ai2StartNodeId: "B-CN",
  ai2InitialControlledNodes: ["B-CN"], 
  neutralKJsWithUnits: ["G-KJ", "D-KJ", "E-KJ"],
  nodes: seraphimGridNodes
};


// --- MASTER MAP DEFINITIONS ---
// This array holds the raw blueprints for all standard maps.
const MAP_DEFINITIONS_NC: NCMapDefinition[] = [
    // --- RESTORED: Fractured Core ---
    {
        name: "Fractured Core",
        ai1StartNodeId: "FC_CN1",
        ai1InitialControlledNodes: ["FC_CN1", "FC_QN1A", "FC_QN1B"],
        ai2StartNodeId: "FC_CN2",
        ai2InitialControlledNodes: ["FC_CN2", "FC_QN2A", "FC_QN2B"],
        neutralKJsWithUnits: ["FC_KJ_Alpha", "FC_KJ_Beta", "FC_KJ_Gamma", "FC_KJ_Delta"],
        nodes: [
            { "id": "FC_CN1", "name": "GEM-Q Core", "type": "CN", "connections": ["FC_QN1A", "FC_QN1B"], "resourcesPerTurn": 3, "hasFabricationHub": false, "mapPosition": { "x": 15, "y": 20 } },
            { "id": "FC_QN1A", "name": "P1 Northlink", "type": "QN", "connections": ["FC_CN1", "FC_QN_NW", "FC_QN_N1"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 25, "y": 10 } },
            { "id": "FC_QN1B", "name": "P1 Westlink", "type": "QN", "connections": ["FC_CN1", "FC_QN_NW", "FC_QN_W1"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 25, "y": 30 } },
            { "id": "FC_CN2", "name": "AXIOM Core", "type": "CN", "connections": ["FC_QN2A", "FC_QN2B"], "resourcesPerTurn": 3, "hasFabricationHub": false, "mapPosition": { "x": 85, "y": 80 } },
            { "id": "FC_QN2A", "name": "P2 Eastlink", "type": "QN", "connections": ["FC_CN2", "FC_QN_SE", "FC_QN_E1"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 75, "y": 70 } },
            { "id": "FC_QN2B", "name": "P2 Southlink", "type": "QN", "connections": ["FC_CN2", "FC_QN_SE", "FC_QN_S1"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 75, "y": 90 } },
            { "id": "FC_KJ_Alpha", "name": "KJ Alpha", "type": "KJ", "connections": ["FC_QN_NW", "FC_QN_NE", "FC_KJ_Beta", "FC_KJ_Gamma"], "resourcesPerTurn": 2, "hasFabricationHub": true, "mapPosition": { "x": 50, "y": 30 } },
            { "id": "FC_KJ_Beta", "name": "KJ Beta", "type": "KJ", "connections": ["FC_QN_NW", "FC_QN_SW", "FC_KJ_Alpha", "FC_KJ_Delta"], "resourcesPerTurn": 2, "hasFabricationHub": true, "mapPosition": { "x": 35, "y": 50 } },
            { "id": "FC_KJ_Gamma", "name": "KJ Gamma", "type": "KJ", "connections": ["FC_QN_NE", "FC_QN_SE", "FC_KJ_Alpha", "FC_KJ_Delta"], "resourcesPerTurn": 2, "hasFabricationHub": true, "mapPosition": { "x": 65, "y": 50 } },
            { "id": "FC_KJ_Delta", "name": "KJ Delta", "type": "KJ", "connections": ["FC_QN_SW", "FC_QN_SE", "FC_KJ_Beta", "FC_KJ_Gamma"], "resourcesPerTurn": 2, "hasFabricationHub": false, "mapPosition": { "x": 50, "y": 70 } }, // Note: Delta has no hub per user definition.
            { "id": "FC_QN_N1", "name": "North Flank", "type": "QN", "connections": ["FC_QN1A", "FC_QN_NE"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 50, "y": 10 } },
            { "id": "FC_QN_W1", "name": "West Flank", "type": "QN", "connections": ["FC_QN1B", "FC_QN_SW"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 10, "y": 50 } },
            { "id": "FC_QN_E1", "name": "East Flank", "type": "QN", "connections": ["FC_QN2A", "FC_QN_NE"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 90, "y": 50 } },
            { "id": "FC_QN_S1", "name": "South Flank", "type": "QN", "connections": ["FC_QN2B", "FC_QN_SW"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 50, "y": 90 } },
            { "id": "FC_QN_NW", "name": "P1 Gateway", "type": "QN", "connections": ["FC_QN1A", "FC_QN1B", "FC_KJ_Alpha", "FC_KJ_Beta"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 30, "y": 25 } },
            { "id": "FC_QN_NE", "name": "NE Connector", "type": "QN", "connections": ["FC_KJ_Alpha", "FC_KJ_Gamma", "FC_QN_N1", "FC_QN_E1"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 70, "y": 25 } },
            { "id": "FC_QN_SW", "name": "SW Connector", "type": "QN", "connections": ["FC_KJ_Beta", "FC_KJ_Delta", "FC_QN_W1", "FC_QN_S1"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 30, "y": 75 } },
            { "id": "FC_QN_SE", "name": "P2 Gateway", "type": "QN", "connections": ["FC_QN2A", "FC_QN2B", "FC_KJ_Gamma", "FC_KJ_Delta"], "resourcesPerTurn": 1, "hasFabricationHub": false, "mapPosition": { "x": 70, "y": 75 } }
        ]
    },
    // --- RESTORED: Global Conflict ---
    {
        name: "Global Conflict",
        ai1StartNodeId: "GC_NA_W", ai1InitialControlledNodes: ["GC_NA_W", "GC_NA_C", "GC_NA_N"],
        ai2StartNodeId: "GC_AS_E", ai2InitialControlledNodes: ["GC_AS_E", "GC_AS_C", "GC_AS_S"],
        neutralKJsWithUnits: ["GC_EU_KJ", "GC_AF_KJ", "GC_SA_KJ"],
        nodes: [
            {"id":"GC_NA_W","name":"NA West","type":"CN","connections":["GC_NA_C","GC_NA_N","GC_SA_N"],"resourcesPerTurn":3,"hasFabricationHub":false,"mapPosition":{"x":15,"y":35}},
            {"id":"GC_NA_C","name":"NA Central","type":"QN","connections":["GC_NA_W","GC_NA_E","GC_NA_N"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":25,"y":35}},
            {"id":"GC_NA_E","name":"NA East","type":"QN","connections":["GC_NA_C","GC_EU_W"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":35,"y":38}},
            {"id":"GC_NA_N","name":"NA North","type":"QN","connections":["GC_NA_W","GC_NA_C","GC_AS_NW"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":20,"y":15}},
            {"id":"GC_SA_N","name":"SA North","type":"QN","connections":["GC_NA_W","GC_SA_KJ"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":30,"y":60}},
            {"id":"GC_SA_KJ","name":"SA KJ","type":"KJ","connections":["GC_SA_N","GC_AF_W"],"resourcesPerTurn":2,"hasFabricationHub":true,"mapPosition":{"x":35,"y":75}},
            {"id":"GC_EU_W","name":"EU West","type":"QN","connections":["GC_NA_E","GC_EU_KJ","GC_AF_N"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":45,"y":35}},
            {"id":"GC_EU_KJ","name":"EU KJ","type":"KJ","connections":["GC_EU_W","GC_EU_E","GC_AS_W"],"resourcesPerTurn":2,"hasFabricationHub":true,"mapPosition":{"x":53,"y":38}},
            {"id":"GC_EU_E","name":"EU East","type":"QN","connections":["GC_EU_KJ","GC_AS_W"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":60,"y":35}},
            {"id":"GC_AF_N","name":"AF North","type":"QN","connections":["GC_EU_W","GC_AF_KJ","GC_AS_SW"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":50,"y":55}},
            {"id":"GC_AF_W","name":"AF West","type":"QN","connections":["GC_SA_KJ","GC_AF_KJ"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":42,"y":65}},
            {"id":"GC_AF_KJ","name":"AF KJ","type":"KJ","connections":["GC_AF_N","GC_AF_W"],"resourcesPerTurn":2,"hasFabricationHub":true,"mapPosition":{"x":55,"y":75}},
            {"id":"GC_AS_NW","name":"AS NW","type":"QN","connections":["GC_NA_N","GC_AS_W"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":70,"y":15}},
            {"id":"GC_AS_W","name":"AS West","type":"QN","connections":["GC_AS_NW","GC_EU_KJ","GC_EU_E","GC_AS_C","GC_AS_SW"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":68,"y":40}},
            {"id":"GC_AS_C","name":"AS Central","type":"QN","connections":["GC_AS_W","GC_AS_E","GC_AS_S"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":78,"y":38}},
            {"id":"GC_AS_E","name":"AS East","type":"CN","connections":["GC_AS_C","GC_AS_S","GC_OC_N"],"resourcesPerTurn":3,"hasFabricationHub":false,"mapPosition":{"x":90,"y":35}},
            {"id":"GC_AS_S","name":"AS South","type":"QN","connections":["GC_AS_C","GC_AS_E","GC_OC_N"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":75,"y":55}},
            {"id":"GC_AS_SW","name":"AS SW","type":"QN","connections":["GC_AS_W","GC_AF_N","GC_OC_W"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":63,"y":50}},
            {"id":"GC_OC_N","name":"OC North","type":"QN","connections":["GC_AS_E","GC_AS_S","GC_OC_C"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":88,"y":60}},
            {"id":"GC_OC_C","name":"OC Central","type":"QN","connections":["GC_OC_N","GC_OC_W"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":85,"y":80}},
            {"id":"GC_OC_W","name":"OC West","type":"QN","connections":["GC_AS_SW","GC_OC_C"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":75,"y":78}}
        ]
    },
    {
        name: "Classic Lattice",
        ai1StartNodeId: "N1", ai1InitialControlledNodes: ["N1", "N3", "N8"],
        ai2StartNodeId: "N2", ai2InitialControlledNodes: ["N2", "N7", "N12"],
        neutralKJsWithUnits: ["N5", "N10", "N6"], 
        nodes: [
          { id: "N1", name: "GEM-Q CN", type: 'CN', connections: ["N3", "N8", "N5"], resourcesPerTurn: 3, hasFabricationHub: false, mapPosition: { x: 10, y: 30 } },
          { id: "N2", name: "AXIOM CN", type: 'CN', connections: ["N7", "N12", "N5"], resourcesPerTurn: 3, hasFabricationHub: false, mapPosition: { x: 90, y: 30 } },
          { id: "N3", name: "Peri-Alpha", type: 'QN', connections: ["N1", "N5", "N6", "N8", "N9"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 30, y: 50 } },
          { id: "N5", name: "KJ Vega", type: 'KJ', connections: ["N1", "N2", "N3", "N6", "N7"], resourcesPerTurn: 2, hasFabricationHub: true, mapPosition: { x: 50, y: 10 } },
          { id: "N6", name: "KJ Nexus", type: 'KJ', connections: ["N3", "N5", "N7", "N9", "N10", "N11"], resourcesPerTurn: 2, hasFabricationHub: true, mapPosition: { x: 50, y: 50 } }, 
          { id: "N7", name: "Peri-Beta", type: 'QN', connections: ["N2", "N5", "N6", "N11", "N12"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 70, y: 50 } },
          { id: "N8", name: "Quad Gamma", type: 'QN', connections: ["N1", "N3", "N9", "N13"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 10, y: 50 } },
          { id: "N9", name: "X-Link Delta", type: 'QN', connections: ["N3", "N6", "N8", "N10", "N13"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 30, y: 70 } },
          { id: "N10", name: "KJ Sirius", type: 'KJ', connections: ["N6", "N9", "N11", "N13", "N14"], resourcesPerTurn: 2, hasFabricationHub: true, mapPosition: { x: 50, y: 90 } },
          { id: "N11", name: "X-Link Zeta", type: 'QN', connections: ["N7", "N6", "N10", "N12", "N14"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 70, y: 70 } },
          { id: "N12", name: "Quad Eta", type: 'QN', connections: ["N2", "N7", "N11", "N14"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 90, y: 50 } },
          { id: "N13", name: "Core Theta", type: 'QN', connections: ["N8", "N9", "N10"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 10, y: 70 } },
          { id: "N14", name: "Core Iota", type: 'QN', connections: ["N10", "N11", "N12"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 90, y: 70 } },
        ]
    },
    {
        name: "Twin Peaks",
        ai1StartNodeId: "TP_N1", ai1InitialControlledNodes: ["TP_N1", "TP_N3"],
        ai2StartNodeId: "TP_N2", ai2InitialControlledNodes: ["TP_N2", "TP_N4"],
        neutralKJsWithUnits: ["TP_KJ1", "TP_KJ2"],
        nodes: [
            { id: "TP_N1", name: "GEM-Q Base", type: 'CN', connections: ["TP_N3", "TP_KJ1"], resourcesPerTurn: 3, hasFabricationHub: false, mapPosition: { x: 15, y: 50 } },
            { id: "TP_N2", name: "AXIOM Base", type: 'CN', connections: ["TP_N4", "TP_KJ2"], resourcesPerTurn: 3, hasFabricationHub: false, mapPosition: { x: 85, y: 50 } },
            { id: "TP_N3", name: "GEM-Q Outpost", type: 'QN', connections: ["TP_N1", "TP_N5"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 30, y: 30 } },
            { id: "TP_N4", name: "AXIOM Outpost", type: 'QN', connections: ["TP_N2", "TP_N6"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 70, y: 30 } },
            { id: "TP_N5", name: "Upper Bridge", type: 'QN', connections: ["TP_N3", "TP_N6", "TP_KJ1"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 50, y: 20 } },
            { id: "TP_N6", name: "Lower Bridge", type: 'QN', connections: ["TP_N4", "TP_N5", "TP_KJ2"], resourcesPerTurn: 1, hasFabricationHub: false, mapPosition: { x: 50, y: 80 } },
            { id: "TP_KJ1", name: "North KJ", type: 'KJ', connections: ["TP_N1", "TP_N5"], resourcesPerTurn: 2, hasFabricationHub: true, mapPosition: { x: 35, y: 70 } },
            { id: "TP_KJ2", name: "South KJ", type: 'KJ', connections: ["TP_N2", "TP_N6"], resourcesPerTurn: 2, hasFabricationHub: true, mapPosition: { x: 65, y: 70 } },
        ]
    },
    seraphimGridMapDefinition,
    // --- The Tartarus Anomaly Definition ---
    {
        name: "The Tartarus Anomaly",
        ai1StartNodeId: "N3", ai1InitialControlledNodes: ["N3", "N0", "N2"],
        ai2StartNodeId: "N10", ai2InitialControlledNodes: ["N10", "N11", "N34"],
        neutralKJsWithUnits: ["N20", "N21", "N22"],
        nodes: [
            {"id":"N3","type":"CN","name":"Elysian Fields (CN)","connections":["N2","N0","N9"],"resourcesPerTurn":3,"hasFabricationHub":false,"mapPosition":{"x":30,"y":100}},
            {"id":"N10","type":"CN","name":"Asphodel Meadows (CN)","connections":["N11","N23","N34"],"resourcesPerTurn":3,"hasFabricationHub":false,"mapPosition":{"x":170,"y":100}},
            {"id":"N20","type":"KJ","name":"Styx Terminus (KJ)","connections":["N32","N33","N31","N30"],"resourcesPerTurn":2,"hasFabricationHub":true,"mapPosition":{"x":100,"y":125}},
            {"id":"N21","type":"KJ","name":"Lethe Confluence (KJ)","connections":["N30","N31","N29","N28"],"resourcesPerTurn":2,"hasFabricationHub":true,"mapPosition":{"x":100,"y":75}},
            {"id":"N22","type":"KJ","name":"Acheron Gate (KJ)","connections":["N32","N33","N27","N6"],"resourcesPerTurn":2,"hasFabricationHub":true,"mapPosition":{"x":100,"y":175}},
            {"id":"N0","type":"QN","name":"Persephone's Gate","connections":["N3","N29"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":45,"y":75}},
            {"id":"N2","type":"QN","name":"Hecate's Veil","connections":["N3","N9","N7","N6","N29"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":45,"y":125}},
            {"id":"N6","type":"QN","name":"Orpheus Relay","connections":["N8","N7","N2","N22"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":80,"y":165}},
            {"id":"N7","type":"QN","name":"The Charon Relay","connections":["N2","N6","N29","N30","N32"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":80,"y":115}},
            {"id":"N8","type":"QN","name":"Eurydice's Hope","connections":["N9","N6"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":35,"y":170}},
            {"id":"N9","type":"QN","name":"Nyx's Approach","connections":["N2","N8","N3"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":15,"y":135}},
            {"id":"N11","type":"QN","name":"Erebus Expanse","connections":["N10","N23","N25"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":180,"y":125}},
            {"id":"N23","type":"QN","name":"Hypnos Channel","connections":["N10","N26","N11","N27","N28"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":155,"y":120}},
            {"id":"N25","type":"QN","name":"Morpheus Drift","connections":["N11","N27"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":175,"y":150}},
            {"id":"N26","type":"QN","name":"Thanatos Link","connections":["N23","N27","N28","N31","N33"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":120,"y":110}},
            {"id":"N27","type":"QN","name":"The Phlegethon","connections":["N25","N23","N26","N22"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":120,"y":165}},
            {"id":"N28","type":"QN","name":"The Cocytus","connections":["N26","N23","N34","N21"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":135,"y":65}},
            {"id":"N29","type":"QN","name":"Hades' Crossing","connections":["N0","N7","N2","N21"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":80,"y":65}},
            {"id":"N30","type":"QN","name":"Tartarus Breach","connections":["N21","N20","N7"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":90,"y":90}},
            {"id":"N31","type":"QN","name":"Cerberus Watch","connections":["N21","N26","N20","N28"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":115,"y":90}},
            {"id":"N32","type":"QN","name":"Sisyphus Loop","connections":["N20","N22","N7"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":90,"y":145}},
            {"id":"N33","type":"QN","name":"Tantalus Reach","connections":["N20","N22","N26"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":110,"y":145}},
            {"id":"N34","type":"QN","name":"The Furies","connections":["N28","N10"],"resourcesPerTurn":1,"hasFabricationHub":false,"mapPosition":{"x":165,"y":75}}
        ]
    }
];

// Master list of all available maps for the UI dropdown.
export const ALL_MAP_TYPES: NoosphericMapType[] = MAP_DEFINITIONS_NC.map(m => m.name);

/**
 * --- CORRECTED CORE LOGIC ---
 * This function transforms a raw map definition into the live game state format.
 * It also applies the initial ownership and unit placement based on the Fog of War setting.
 */
function createInitialMapState(mapDef: NCMapDefinition, isFogOfWarActive: boolean): Record<string, NoosphericNodeData> {
  const transformedNodes: Record<string, NoosphericNodeData> = {};

  mapDef.nodes.forEach(nodeDef => {
    let owner: NoosphericPlayerId = 'NEUTRAL';
    let initialStandardUnits = 0;
    const maxUnits = nodeDef.type === 'CN' ? 35 : nodeDef.type === 'KJ' ? 25 : 15;

    // --- FIX: New Fog of War Starting Condition Logic ---
    if (isFogOfWarActive) {
        if (nodeDef.id === mapDef.ai1StartNodeId) {
            owner = 'GEM-Q';
            initialStandardUnits = 15; 
        } else if (nodeDef.id === mapDef.ai2StartNodeId) {
            owner = 'AXIOM';
            initialStandardUnits = 15;
        } else if (mapDef.neutralKJsWithUnits.includes(nodeDef.id)) {
            initialStandardUnits = 5; // Neutral KJs still get a garrison
        }
    } else { // Fog of War is OFF, use standard start
        if (mapDef.ai1InitialControlledNodes.includes(nodeDef.id)) {
          owner = 'GEM-Q';
          initialStandardUnits = nodeDef.type === 'CN' ? 15 : 10;
        } else if (mapDef.ai2InitialControlledNodes.includes(nodeDef.id)) {
          owner = 'AXIOM';
          initialStandardUnits = nodeDef.type === 'CN' ? 15 : 10;
        } else if (mapDef.neutralKJsWithUnits.includes(nodeDef.id)) {
          initialStandardUnits = 5;
        }
    }
    
    let displayLabel: string;
    if (nodeDef.type === 'CN') displayLabel = 'CN';
    else if (nodeDef.type === 'KJ') displayLabel = 'KJ';
    else displayLabel = nodeDef.id;


    transformedNodes[nodeDef.id] = {
      id: nodeDef.id,
      label: displayLabel, 
      regionName: nodeDef.name,
      owner: owner,
      standardUnits: initialStandardUnits,
      evolvedUnits: 0, 
      qrOutput: nodeDef.resourcesPerTurn,
      isKJ: nodeDef.type === 'KJ',
      isCN: nodeDef.type === 'CN',
      x: nodeDef.mapPosition.x,
      y: nodeDef.mapPosition.y,
      connections: nodeDef.connections,
      maxUnits: maxUnits,
      hasFabricationHub: nodeDef.hasFabricationHub,
      isHubActive: false, 
      hubDisconnectedTurn: undefined, 
    };
  });
  return transformedNodes;
}

// --- PRIMARY EXPORTED FUNCTIONS ---
export function getMapDataByType(mapType: NoosphericMapType, isFogOfWarActive: boolean): Record<string, NoosphericNodeData> {
    const mapDefinition = MAP_DEFINITIONS_NC.find(m => m.name === mapType);
    if (!mapDefinition) {
        console.warn(`Unknown map type: ${mapType}, defaulting to The Tartarus Anomaly.`);
        const defaultMapDef = MAP_DEFINITIONS_NC.find(m => m.name === "The Tartarus Anomaly")!;
        if (!defaultMapDef) { // Should not happen if Tartarus Anomaly is always in MAP_DEFINITIONS_NC
             console.error("CRITICAL: Default map 'The Tartarus Anomaly' not found in definitions. Returning empty map data.");
             return {};
        }
        return createInitialMapState(defaultMapDef, isFogOfWarActive);
    }
    if (!mapDefinition.nodes || mapDefinition.nodes.length === 0) {
        console.warn(`Map definition for "${mapType}" found, but its 'nodes' array is empty or undefined. Defaulting to The Tartarus Anomaly. Please define nodes for this map.`);
        const defaultMapDef = MAP_DEFINITIONS_NC.find(m => m.name === "The Tartarus Anomaly")!;
        if (!defaultMapDef) { // Should not happen
             console.error("CRITICAL: Default map 'The Tartarus Anomaly' not found in definitions (fallback). Returning empty map data.");
             return {};
        }
        return createInitialMapState(defaultMapDef, isFogOfWarActive);
    }
    return createInitialMapState(mapDefinition, isFogOfWarActive);
}

export function calculateInitialFactionData(mapNodes: Record<string, NoosphericNodeData>): Record<NoosphericPlayerId, NoosphericFaction> {
    const factions: Record<NoosphericPlayerId, NoosphericFaction> = {
        'GEM-Q': { id: 'GEM-Q', name: AI1_NAME, color: 'var(--color-ai1-text)', qr: 25, nodesControlled: 0, totalUnits: 0, kjsHeld: 0, tacticalAnalysis: "Awaiting game start...", totalStandardUnits: 0, totalEvolvedUnits: 0, activeHubsCount: 0, successfulAttacks: 0, attacksLost: 0, successfulDefenses: 0, defensesLost: 0, successfulTurnAttempts: 0, failedTurnAttempts: 0, unitsPurchased: 0, unitsLost: 0, tacticalAnalysisHistory: [] },
        'AXIOM': { id: 'AXIOM', name: AI2_NAME, color: 'var(--color-ai2-text)', qr: 25, nodesControlled: 0, totalUnits: 0, kjsHeld: 0, tacticalAnalysis: "Awaiting scenario parameters...", totalStandardUnits: 0, totalEvolvedUnits: 0, activeHubsCount: 0, successfulAttacks: 0, attacksLost: 0, successfulDefenses: 0, defensesLost: 0, successfulTurnAttempts: 0, failedTurnAttempts: 0, unitsPurchased: 0, unitsLost: 0, tacticalAnalysisHistory: [] },
        'NEUTRAL': { id: 'NEUTRAL', name: 'NEUTRAL', color: '#888888', qr: 0, nodesControlled: 0, totalUnits: 0, kjsHeld: 0, totalStandardUnits: 0, totalEvolvedUnits: 0, activeHubsCount: 0, successfulAttacks: 0, attacksLost: 0, successfulDefenses: 0, defensesLost: 0, successfulTurnAttempts: 0, failedTurnAttempts: 0, unitsPurchased: 0, unitsLost: 0, tacticalAnalysisHistory: [] }
    };

    // This function now simply totals up the pre-configured map data.
    for (const nodeId in mapNodes) {
        const node = mapNodes[nodeId];
        const unitsOnNode = (node.standardUnits || 0) + (node.evolvedUnits || 0);
        if (node.owner !== 'NEUTRAL') {
            factions[node.owner].nodesControlled++;
            factions[node.owner].totalUnits += unitsOnNode;
            factions[node.owner].totalStandardUnits += (node.standardUnits || 0);
            factions[node.owner].totalEvolvedUnits += (node.evolvedUnits || 0); 
            if (node.isKJ && isNodeConnectedToCN(node.id, node.owner, mapNodes)) { // Check connectivity for KJ count
                factions[node.owner].kjsHeld++;
            }
        } else {
            factions['NEUTRAL'].nodesControlled++;
            factions['NEUTRAL'].totalUnits += unitsOnNode;
            factions['NEUTRAL'].totalStandardUnits += (node.standardUnits || 0);
            factions['NEUTRAL'].totalEvolvedUnits += (node.evolvedUnits || 0);
            if (node.isKJ) factions['NEUTRAL'].kjsHeld++; // Neutral KJs always count if held by neutral
        }
    }
    return factions;
}

// Helper (not exported, but used internally by calculateInitialFactionData)
const isNodeConnectedToCN = (nodeId: string, factionId: NoosphericPlayerId, mapNodes: Record<string, NoosphericNodeData>): boolean => {
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

// --- Path for components to import the correct version ---
export const NOOSPHERIC_MAP_DATA_PATH_FOR_COMPONENTS = '../data/noospheric-map-data';
