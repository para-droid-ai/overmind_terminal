
import { ChimeraMapData, ChimeraMapNode } from '../types';

// Adapting "Twin Peaks" from Noospheric Conquest for Chimera
const chimeraTwinPeaksMain: ChimeraMapData = {
  id: "chimera_twin_peaks_main",
  name: "Twin Peaks - Derelict Installation",
  defaultEntryNodeId: "TP_N1", // Start node
  // originalLocationBlueprintId: "player_hab_unit_01", // Keep for reference if some global interactables are still sourced this way
  nodes: {
    "TP_N1": {
      id: "TP_N1",
      name: "Derelict Hab-Block Alpha",
      description: "Cramped living quarters, signs of hasty abandonment. A faint hum emanates from a nearby console.",
      x: 15, y: 50,
      connections: ["TP_N3", "TP_KJ1"],
      isStartNode: true,
      interactableObjectIds: ["player_terminal", "bed", "storage_locker", "door_main_exit_to_TP_N3"], // Interactables from hab-unit
    },
    "TP_N2": {
      id: "TP_N2",
      name: "Abandoned Sector 7 Entrance",
      description: "A sealed blast door, graffitied and scarred. Looks like it hasn't opened in years.",
      x: 85, y: 50,
      connections: ["TP_N4", "TP_KJ2"],
      interactableObjectIds: ["sealed_blast_door_TP_N2", "security_camera_TP_N2"],
    },
    "TP_N3": {
      id: "TP_N3",
      name: "West Sector Maintenance Access",
      description: "A narrow corridor with exposed conduits and flickering lights. Leads deeper into the installation.",
      x: 30, y: 30,
      connections: ["TP_N1", "TP_N5"],
      interactableObjectIds: ["access_panel_TP_N3", "ventilation_shaft_TP_N3"],
    },
    "TP_N4": {
      id: "TP_N4",
      name: "East Sector Guard Post",
      description: "An abandoned security checkpoint. Shattered plasteel and overturned barriers.",
      x: 70, y: 30,
      connections: ["TP_N2", "TP_N6"],
      interactableObjectIds: ["security_console_TP_N4", "weapon_locker_TP_N4_empty"],
    },
    "TP_N5": {
      id: "TP_N5",
      name: "Upper Walkway Connector",
      description: "A precarious metal walkway spanning a dark chasm. The air is cold.",
      x: 50, y: 20,
      connections: ["TP_N3", "TP_N6", "TP_KJ1"],
      interactableObjectIds: ["broken_console_TP_N5", "loose_railing_TP_N5"],
    },
    "TP_N6": {
      id: "TP_N6",
      name: "Lower Utility Corridor",
      description: "Pipes line the walls, dripping with condensation. A constant, low thrum can be felt.",
      x: 50, y: 80,
      connections: ["TP_N4", "TP_N5", "TP_KJ2"],
      interactableObjectIds: ["steam_pipe_TP_N6", "maintenance_hatch_TP_N6_sealed"],
    },
    "TP_KJ1": {
      id: "TP_KJ1",
      name: "North Power Substation",
      description: "Large transformers hum loudly. Warning signs in multiple languages, mostly ignored.",
      x: 35, y: 70,
      connections: ["TP_N1", "TP_N5"],
      interactableObjectIds: ["main_power_junction_TP_KJ1", "locked_high_voltage_cabinet_TP_KJ1"],
    },
    "TP_KJ2": {
      id: "TP_KJ2",
      name: "South Comms Relay",
      description: "A towering antenna array, mostly derelict. Some systems still show faint power.",
      x: 65, y: 70,
      connections: ["TP_N2", "TP_N6"],
      isExitNode: true, // Example exit node
      exitLeadsToMapId: "neo_kyoto_data_haven", // Hypothetical next map
      interactableObjectIds: ["comms_console_TP_KJ2", "damaged_satellite_dish_TP_KJ2"],
    }
  }
};

export const chimeraMaps: Record<string, ChimeraMapData> = {
  [chimeraTwinPeaksMain.id]: chimeraTwinPeaksMain
};
