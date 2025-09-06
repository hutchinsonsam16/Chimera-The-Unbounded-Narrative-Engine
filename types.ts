export enum GamePhase {
  ONBOARDING = 'ONBOARDING',
  PLAYING = 'PLAYING',
}

export enum GenerationService {
  CLOUD = 'cloud',
  LOCAL = 'local',
}

export enum LocalImageModelQuality {
  PERFORMANCE = 'performance',
  QUALITY = 'quality',
}

export interface Quest {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'failed';
}

export interface KnowledgeBaseEntry {
  id: string;
  name: string;
  type: 'npc' | 'location' | 'item' | 'lore';
  fields: { [key: string]: string };
}

export interface StoryLogEntry {
  id: string;
  type: 'player' | 'narrative' | 'image' | 'system';
  content: string;
  prompt?: string; // For images
  timestamp: string;
}

export interface Character {
  name: string;
  backstory: string;
  skills: { [key: string]: string };
  inventory: string[];
  status: { [key: string]: string };
  imageUrl: string;
  imageUrlHistory: { url: string; prompt: string }[];
}

export interface NPC {
  id: string;
  name: string;
  description: string;
  relationship: string; // e.g., "Friendly", "Hostile", "Neutral"
  imageUrl?: string;
  imageUrlHistory?: { url: string; prompt: string }[];
}

export interface KnowledgeBase {
    [id: string]: KnowledgeBaseEntry;
}

export interface World {
  lore: string; // for narrative flavour and map locations
  npcs: NPC[];
  knowledgeBase: KnowledgeBase;
}

export interface GameState {
  phase: GamePhase;
  isLoading: boolean;
  storyLog: StoryLogEntry[];
  timeline: { id: string, description: string, timestamp: string }[];
  quests: Quest[];
}

export type PanelType = 'character' | 'narrative' | 'context';

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    bg: string;
  };
  fonts: {
    body: string;
    heading: string;
  };
  baseFontSize: number;
  backgroundImage?: string;
}

export interface Settings {
  appName: string;
  engine: {
    service: GenerationService;
    local: {
      textModel: string;
      imageModel: string;
      imageQuality: LocalImageModelQuality;
    };
    cloud: {
      textModel: string;
      imageModel: string;
      systemPrompt: string;
    };
  };
  layout: {
    panelOrder: PanelType[];
    panelSizes: number[];
  };
  gameplay: {
      promptAssist: boolean;
  };
  componentVisibility: {
    character: {
      portrait: boolean;
      status: boolean;
      skills: boolean;
      inventory: boolean;
      backstory: boolean;
    };
    context: {
      npcs: boolean;
      relationshipWeb: boolean;
      map: boolean;
      lore: boolean;
    };
    resourceMonitor: boolean;
  };
  theme: Theme;
}

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

export interface GameData {
    character: Character;
    world: World;
    gameState: GameState;
}

export interface Snapshot {
    id: string;
    name: string;
    createdAt: string;
    data: GameData;
}

export interface AppState extends GameData {
  settings: Settings;
  snapshots: Snapshot[];
  isSettingsOpen: boolean;
  isDiceRollerOpen: boolean;
  isAudioPlayerOpen: boolean;
  isCommandPaletteOpen: boolean;
  audioUrl: string;
  toasts: Toast[];
  
  // Actions
  handlePlayerAction: (action: string) => Promise<void>;
  parseAndApplyTags: (rawResponse: string) => Promise<string>;
  startGame: (worldConcept: string, charName: string, charBackstory: string, openingPrompt: string) => void;
  saveGame: () => void;
  loadGame: (file: File) => void;
  exportGame: () => Promise<void>;
  exportCharacterSheet: () => void;
  restartGame: () => void;
  
  // UI Actions
  toggleSettings: () => void;
  toggleDiceRoller: () => void;
  toggleAudioPlayer: () => void;
  toggleCommandPalette: () => void;
  setAudioUrl: (url: string) => void;
  setPanelOrder: (order: PanelType[]) => void;
  setPanelSizes: (sizes: number[]) => void;
  setSettings: (settings: Partial<Settings>) => void;
  updateLogEntry: (id: string, newContent: string) => void;
  regenerateFrom: (id: string) => void;
  generateCharacterPortrait: () => Promise<void>;

  // Snapshot Actions
  createSnapshot: (name: string) => void;
  loadSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
  
  // Toast Actions
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;

  // History Actions
  // undo and redo are handled by zundo middleware and custom hooks
}