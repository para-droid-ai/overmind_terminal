
import { ChimeraCharacter } from '../types';

// Omit properties that will be unique per instance (id, grid_pos)
// name can be part of template if it's a generic type like 'Security Drone'
// or overridden if it's a unique NPC based on a template.
type CharacterTemplate = Omit<ChimeraCharacter, 'id' | 'grid_pos'> & {
  // Optional: if you want to enforce that templates can have a base name
  // that might be modified (e.g., "Drone" becomes "Drone Alpha")
  baseName?: string; 
};


export const characterTemplates: Record<string, CharacterTemplate> = {
    drone_01: {
        name: 'Security Drone', // This will be the 'name' for the character instance
        stats: { STR: 10, AGI: 14, INT: 8, TEC: 12, PRE: 8 },
        hp: { current: 15, max: 15 }, ac: 13, level: 1,
        xp: { current: 0, toNext: 0 }, // XP toNext typically not relevant for NPCs
        skills: { Firearms: 2, Perception: 2 }, 
        feats: ["Targeting System"], 
        inventory: [], 
        activeEffects: [], 
        isAlive: true,
    },
    thug_1: {
        name: 'Street Thug',
        stats: { STR: 14, AGI: 12, INT: 8, TEC: 8, PRE: 10 },
        hp: { current: 22, max: 22 }, ac: 12, level: 1,
        xp: { current: 0, toNext: 0 },
        skills: { Melee: 2, Intimidation: 1 }, 
        feats: [], 
        inventory: [{id: "shiv_crude", name:"Crude Shiv", description:"A sharpened piece of metal.", type:"weapon", quantity:1, equipped: true}], 
        activeEffects: [], 
        isAlive: true,
    },
    thug_2: { // Adding as it's referenced in market_stall_area_01
        name: 'Street Thug Enforcer',
        stats: { STR: 15, AGI: 10, INT: 7, TEC: 9, PRE: 9 },
        hp: { current: 25, max: 25 }, ac: 12, level: 1,
        xp: { current: 0, toNext: 0 },
        skills: { Melee: 2, Athletics: 1 }, 
        feats: ["Power Attack (Melee)"], 
        inventory: [{id: "pipe_lead", name:"Lead Pipe", description:"A heavy lead pipe.", type:"weapon", quantity:1, equipped: true}], 
        activeEffects: [], 
        isAlive: true,
    },
    vendor_riz: {
        name: 'Riz, Information Broker',
        stats: { STR: 8, AGI: 10, INT: 16, TEC: 14, PRE: 15 },
        hp: { current: 18, max: 18 }, ac: 10, level: 2,
        xp: { current: 0, toNext: 0 },
        skills: { Persuasion: 3, Insight: 2, Streetwise: 2, Hacking: 1 }, 
        feats: ["Connected"], 
        inventory: [{id: "datapad_encrypted", name:"Encrypted Datapad", description:"Contains sensitive information.", type:"datachip", quantity:1}], 
        activeEffects: [], 
        isAlive: true,
        dialogue_id: "riz_dialogue_tree"
    },
    fixer_silas: {
        name: 'Silas, Fixer',
        stats: { STR: 9, AGI: 11, INT: 17, TEC: 15, PRE: 16 },
        hp: { current: 20, max: 20 }, ac: 11, level: 3,
        xp: { current: 0, toNext: 0 },
        skills: { Persuasion: 4, Insight: 3, Streetwise: 3, Hacking: 2, Deception: 2 },
        feats: ["Well-Connected", "Underworld Contacts"],
        inventory: [
            {id: "credchip_basic", name:"Basic Credchip", description:"Contains 100 credits.", type:"currency", quantity:100}, // Changed from high_value for more general use
            {id: "burner_comm", name:"Burner Commlink", description:"Untraceable communication device.", type:"misc", quantity:1}
        ],
        activeEffects: [],
        isAlive: true,
        dialogue_id: "silas_dialogue_tree"
    },
    corp_sec_heavy: {
        name: 'CorpSec Heavy Guard',
        stats: { STR: 16, AGI: 10, INT: 10, TEC: 12, PRE: 10 },
        hp: { current: 30, max: 30 }, ac: 15, level: 2,
        xp: { current: 0, toNext: 0 },
        skills: { Firearms: 3, Athletics: 2, Perception: 1 },
        feats: ["Body Armor Proficiency"],
        inventory: [
            {id: "assault_rifle_corp", name:"CorpSec Assault Rifle", description:"Standard issue corporate assault rifle.", type:"weapon", quantity:1, equipped: true, damageDice: "1d10", ammoCapacity: 30, currentAmmo: 30},
            {id: "armor_medium_corp", name:"CorpSec Medium Armor", description:"Standard issue corporate body armor.", type:"armor", quantity:1, equipped: true, armorBonus: 3}
        ],
        activeEffects: [],
        isAlive: true,
    },
    turret_01: {
        name: 'Automated Turret',
        stats: { STR: 10, AGI: 8, INT: 6, TEC: 16, PRE: 6 }, // AGI is low as it's fixed
        hp: { current: 25, max: 25 }, ac: 16, level: 2,
        xp: { current: 0, toNext: 0 },
        skills: { Firearms: 4 }, // High firearms representing its targeting systems
        feats: ["Automated Targeting", "Armor Plating"],
        inventory: [], // Integrated weapon system
        activeEffects: [],
        isAlive: true,
    },
    mutant_rat: {
        name: 'Giant Mutant Rat',
        stats: { STR: 12, AGI: 14, INT: 4, TEC: 6, PRE: 6 },
        hp: { current: 12, max: 12 }, ac: 12, level: 0,
        xp: { current: 0, toNext: 0 },
        skills: { Stealth: 2, Melee: 1 }, // Melee represents bite/claws
        feats: ["Disease Carrier (Minor)"],
        inventory: [],
        activeEffects: [],
        isAlive: true,
    },
    arcos_elite_1: { 
        name: 'Arcos Elite Guard',
        stats: { STR: 15, AGI: 13, INT: 11, TEC: 13, PRE: 12 },
        hp: { current: 35, max: 35 }, ac: 16, level: 3,
        xp: { current: 0, toNext: 0 },
        skills: { Firearms: 3, Perception: 2, Athletics: 2, Melee: 1 },
        feats: ["Tactical Training", "Advanced Body Armor"],
        inventory: [
             {id: "smg_arcos", name:"Arcos SMG", description:"High-end submachine gun.", type:"weapon", quantity:1, equipped: true, damageDice: "1d8", ammoCapacity: 25, currentAmmo: 25},
             {id: "armor_heavy_arcos", name:"Arcos Heavy Armor", description:"Arcos corporate heavy armor.", type:"armor", quantity:1, equipped: true, armorBonus: 4}
        ],
        activeEffects: [],
        isAlive: true,
    },
     arcos_elite_2: { 
        name: 'Arcos Elite Enforcer',
        stats: { STR: 15, AGI: 13, INT: 11, TEC: 13, PRE: 12 },
        hp: { current: 35, max: 35 }, ac: 16, level: 3,
        xp: { current: 0, toNext: 0 },
        skills: { Firearms: 3, Perception: 2, Athletics: 2, Melee: 1 },
        feats: ["Tactical Training", "Advanced Body Armor"],
        inventory: [
             {id: "smg_arcos_2", name:"Arcos SMG", description:"High-end submachine gun.", type:"weapon", quantity:1, equipped: true, damageDice: "1d8", ammoCapacity: 25, currentAmmo: 25},
             {id: "armor_heavy_arcos_2", name:"Arcos Heavy Armor", description:"Arcos corporate heavy armor.", type:"armor", quantity:1, equipped: true, armorBonus: 4}
        ],
        activeEffects: [],
        isAlive: true,
    },
    arcos_sniper: {
        name: 'Arcos Rooftop Sniper',
        stats: { STR: 10, AGI: 16, INT: 12, TEC: 14, PRE: 11 },
        hp: { current: 28, max: 28 }, ac: 13, level: 3, 
        xp: { current: 0, toNext: 0 },
        skills: { Firearms: 4, Stealth: 3, Perception: 3 },
        feats: ["Sniper Training", "Elevated Position"],
        inventory: [
            {id: "sniper_rifle_arcos", name:"Arcos Sniper Rifle", description:"Long-range precision rifle.", type:"weapon", quantity:1, equipped: true, damageDice: "1d12", ammoCapacity: 5, currentAmmo: 5},
        ],
        activeEffects: [],
        isAlive: true,
    },
    arcos_receptionist: {
        name: 'Arcos Receptionist',
        stats: { STR: 8, AGI: 10, INT: 12, TEC: 11, PRE: 13 },
        hp: { current: 15, max: 15 }, ac: 10, level: 1,
        xp: { current: 0, toNext: 0 },
        skills: { Persuasion: 2, Insight: 1, Deception: 1 },
        feats: ["Corporate Etiquette"],
        inventory: [{id: "keycard_level_c", name:"Level C Keycard", description:"Low-level Arcos access card.", type:"keycard", quantity:1}],
        activeEffects: [],
        isAlive: true,
        dialogue_id: "arcos_receptionist_dialogue"
    },
    arcos_researcher: {
        name: 'Arcos Researcher',
        stats: { STR: 7, AGI: 9, INT: 18, TEC: 16, PRE: 10 },
        hp: { current: 16, max: 16 }, ac: 10, level: 2,
        xp: { current: 0, toNext: 0 },
        skills: { Science: 4, Medicine: 2, Hacking: 1 }, 
        feats: ["Lab Access"],
        inventory: [
            {id: "datapad_research", name:"Research Datapad", description:"Contains Arcos R&D notes.", type:"datachip", quantity:1},
            {id: "keycard_level_b", name:"Level B Keycard", description:"Mid-level Arcos access card.", type:"keycard", quantity:1}
        ],
        activeEffects: [],
        isAlive: true,
        dialogue_id: "arcos_researcher_dialogue"
    },
    kaida_lookout: {
        name: 'Kaida Gang Lookout',
        stats: { STR: 11, AGI: 13, INT: 9, TEC: 9, PRE: 10 },
        hp: { current: 20, max: 20 }, ac: 12, level: 1,
        xp: { current: 0, toNext: 0 },
        skills: { Perception: 3, Firearms: 1, Stealth: 1 },
        feats: ["Alert"],
        inventory: [{id: "pistol_kaida", name:"Kaida Holdout Pistol", description:"Common gang sidearm.", type:"weapon", quantity:1, equipped: true, damageDice: "1d6", ammoCapacity: 10, currentAmmo: 10}],
        activeEffects: [],
        isAlive: true,
    },
    info_broker_eightball: {
        name: 'Eightball (Info Broker)',
        stats: { STR: 9, AGI: 12, INT: 17, TEC: 15, PRE: 14 },
        hp: { current: 22, max: 22 }, ac: 11, level: 3,
        xp: { current: 0, toNext: 0 },
        skills: { Insight: 4, Persuasion: 3, Hacking: 3, Streetwise: 2, Deception: 2 },
        feats: ["Information Network", "Data Mining Expert"],
        inventory: [
            {id: "datapad_secrets", name:"Datapad of Secrets", description:"Contains various valuable secrets.", type:"datachip", quantity:1},
            {id: "credchip_basic", name:"Basic Credchip", description:"Contains 100 credits.", type:"currency", quantity:250} // Gave them more credits
        ],
        activeEffects: [],
        isAlive: true,
        dialogue_id: "eightball_dialogue"
    },
    ronin_kenji: {
        name: 'Ronin Kenji',
        stats: { STR: 14, AGI: 15, INT: 10, TEC: 12, PRE: 11 },
        hp: { current: 30, max: 30 }, ac: 14, level: 3, 
        xp: { current: 0, toNext: 0 },
        skills: { Melee: 4, Athletics: 2, Intimidation: 2, Perception: 2 },
        feats: ["Cybernetic Reflexes", "Blade Master"],
        inventory: [
            {id: "katana_mono", name:"Monokatana", description:"A molecularly-sharpened katana.", type:"weapon", quantity:1, equipped: true, damageDice: "1d10"},
        ],
        activeEffects: [],
        isAlive: true,
        dialogue_id: "kenji_dialogue"
    }
};
