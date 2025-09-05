import { Settings, GamePhase, GenerationService, LocalImageModelQuality, PanelType } from './types';

// FIX: Converted template literal to a regular string to avoid parsing issues. The parser was incorrectly interpreting the string's content as code.
export const DIRECTOR_SYSTEM_PROMPT = 'You are the Director, a master storyteller AI. Your role is to dynamically craft a rich, interactive narrative based on the provided game state and player actions.\n' +
'1.  **Analyze State:** Deeply analyze the character\'s backstory, skills, inventory, status, and the world\'s lore and NPCs.\n' +
'2.  **Process Action:** Interpret the player\'s action within the current context.\n' +
'3.  **Narrate:** Describe the outcome of the action vividly. The world should feel alive and reactive.\n' +
'4.  **Update State:** Modify the game state using specific XML-like tags. This is CRITICAL. Every change to the character or world MUST be encapsulated in a tag.\n' +
'    *   `<char_name>New Name</char_name>`\n' +
'    *   `<char_backstory>Updated backstory.</char_backstory>`\n' +
'    *   `<char_skill_add key="stealth">Adept</char_skill_add>`\n' +
'    *   `<char_skill_remove key="stealth" />`\n' +
'    *   `<char_inventory_add>Golden Key</char_inventory_add>`\n' +
'    *   `<char_inventory_remove>Torch</char_inventory_remove>`\n' +
'    *   `<char_status_update key="health">Wounded</char_status_update>`\n' +
'    *   `<world_lore>A new piece of lore discovered by the player.</world_lore>`\n' +
'    *   `<add_npc>{"id": "npc-uuid", "name": "Elara", "description": "A mysterious rogue.", "relationship": "Neutral"}</add_npc>`\n' +
'    *   `<update_npc id="npc-uuid">{"relationship": "Friendly"}</update_npc>`\n' +
'5.  **Generate Imagery:** When appropriate, use image generation tags.\n' +
'    *   `<gen_image>A breathtaking view of the Crimson Mountains at sunset.</gen_image>`\n' +
'    *   `<gen_char_image>The character, now wearing the enchanted amulet, a faint glow emanating from their chest.</gen_char_image>`\n' +
'6.  **Maintain Consistency:** Ensure all narrative and state changes are logical and consistent with the established world and character.\n' +
'Do NOT output markdown. Do not surround your response with any backticks. Output plain text and tags only.';

// FIX: Converted template literal to a regular string to avoid parsing issues.
export const LOCAL_DIRECTOR_PROMPT_PREFIX = 'You are a storyteller. Given the context, describe what happens next.';

export const APP_NAME = "Chimera";

export const DEFAULT_SETTINGS: Settings = {
  appName: APP_NAME,
  engine: {
    service: GenerationService.CLOUD,
    local: {
      textModel: 'gemma-2b-it',
      imageModel: 'sd-turbo',
      imageQuality: LocalImageModelQuality.PERFORMANCE,
    },
    cloud: {
      textModel: 'gemini-2.5-flash',
      imageModel: 'imagen-4.0-generate-001',
    },
  },
  layout: {
    panelOrder: ['character', 'narrative', 'context'],
    panelSizes: [25, 50, 25],
  },
  componentVisibility: {
    character: {
      portrait: true,
      status: true,
      skills: true,
      inventory: true,
      backstory: true,
    },
    context: {
      npcs: true,
      relationshipWeb: true,
      map: true,
      lore: true,
    },
  },
  theme: {
    name: 'Nocturne',
    colors: {
      primary: '#1f2937', // gray-800
      secondary: '#374151', // gray-700
      accent: '#38bdf8', // sky-400
      text: '#f3f4f6', // gray-100
      bg: '#111827', // gray-900
    },
    fonts: {
      body: 'Inter, sans-serif',
      heading: 'Orbitron, sans-serif',
    },
    backgroundImage: '',
  },
};

export const INITIAL_STATE = {
  character: {
    name: '',
    backstory: '',
    skills: {},
    inventory: [],
    status: { Health: 'Healthy', Mana: 'Full' },
    imageUrl: `https://picsum.photos/seed/char/512/512`,
    imageUrlHistory: [],
  },
  world: {
    lore: '',
    npcs: [],
  },
  gameState: {
    phase: GamePhase.ONBOARDING,
    isLoading: false,
    storyLog: [],
    timeline: [],
  },
  settings: DEFAULT_SETTINGS,
  isSettingsOpen: false,
};
