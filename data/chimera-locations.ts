
import { LocationBlueprint } from '../types'; // Adjust path if necessary

export const chimeraLocationData: LocationBlueprint[] = [
  {
    id: "player_hab_unit_01",
    name: "Kaelen's Hab-Unit & Corridor Niche",
    description: "A cramped, personal habitation unit, barely larger than the single coffin-style bed pushed against one wall. A flickering neon sign from outside casts long shadows. Opposite the bed, a worn console serves as a makeshift desk. A single, reinforced door leads out. A small alcove near the door seems to be part of a narrow maintenance corridor.",
    grid_size: { width: 12, height: 18 }, // e.g., 12 cells wide, 18 cells tall
    svg_viewBox: "0 0 120 180", // Assuming 1 cell = 10x10 SVG units
    interactables: [
      { 
        id: "door_main_exit", 
        type: "door", 
        grid_pos: "H1", // Example: Column H (8th), Row 1
        svg_id: "svg_door_main_exit_group", // ID for targeting SVG elements
        default_state: "locked",
        // leads_to_location_id: "residential_corridor_01",
        // dc_to_open: 15, // (if locked by mechanics)
        // key_required: "key_hab_01" 
      },
      { 
        id: "player_terminal", 
        type: "terminal", 
        grid_pos: "C16", // Example: Column C, Row 16
        svg_id: "svg_player_terminal_group",
        default_state: "active", // e.g., on, off, locked_out
        // dc_to_hack: 18,
        // information_id: "message_encrypted_job_offer"
      },
      { 
        id: "bed", 
        type: "furniture", 
        grid_pos: "B2", // Top-left corner
        svg_id: "svg_bed_group",
        default_state: "unmade",
        size_in_cells: { width: 4, height: 2 } // Bed is 4 cells wide, 2 cells tall
      },
      { 
        id: "storage_locker", 
        type: "container", 
        grid_pos: "B12", // Top-left corner
        svg_id: "svg_storage_locker_group",
        default_state: "closed_unlocked",
        size_in_cells: { width: 2, height: 4 },
        // items: [{ id: "ammo_pistol_basic", quantity: 20 }, { id: "credstick_low", value: 50 }],
        // dc_to_lockpick: 12
      }
    ],
    spawn_points: [
      { id: "player_start", grid_pos: "D4" }
    ],
    // Example pathing data (0 = walkable, 1 = wall/obstacle)
    // This would be a 2D array matching grid_size.
    // For simplicity, we're omitting the full pathing_data here,
    // but ChimeraMapDisplay would ideally use it.
    // pathing_data: [
    //   [1,1,1,1,1,1,1,0,1,1,1,1], // Row 1 (door at H1)
    //   [1,0,0,0,0,1,1,0,1,1,1,1], // Row 2 (Bed from B2 to E2)
    //   [1,0,0,0,0,1,1,0,1,1,1,1], // Row 3
    //   [1,0,0,0,0,0,0,0,0,0,0,1], // Row 4 (Player start D4)
    //   ... (rest of the rows)
    //   [1,1,0,0,1,1,1,1,1,1,1,1], // Row 16 (Terminal C16)
    //   [1,1,1,1,1,1,1,1,1,1,1,1], // Row 17
    //   [1,1,1,1,1,1,1,1,1,1,1,1], // Row 18
    // ]
  },
  // Placeholder for 'residential_corridor_01' and 'residential_hub_atrium_01'
  // These should be fully defined here if needed for the game.
  // Example:
  // {
  //   id: "residential_corridor_01",
  //   name: "Residential Corridor Section 7",
  //   description: "A dimly lit, narrow corridor lined with identical hab-unit doors. The air smells of ozone and stale synth-food.",
  //   grid_size: { width: 6, height: 25 }, // Example
  //   svg_viewBox: "0 0 60 250",
  //   interactables: [
  //     { id: "door_to_hab_01_corridor_side", type: "door", grid_pos: "C1", svg_id: "svg_door_to_hab_01_corridor_side", default_state: "closed", /* leads_to_location_id: "player_hab_unit_01" */ },
  //     { id: "access_panel_01", type: "terminal", grid_pos: "A15", svg_id: "svg_access_panel_01", default_state: "locked_out" },
  //   ],
  //   spawn_points: [ { id: "entry_from_hab_01", grid_pos: "C2" } ]
  // },
];
