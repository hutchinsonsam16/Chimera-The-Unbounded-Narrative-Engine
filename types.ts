
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
}

export interface World {
  lore: string;
  npcs: NPC[];
}

export interface GameState {
  phase: GamePhase;
  isLoading: boolean;
  storyLog: StoryLogEntry[];
  timeline: string[];
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

export interface AppState extends GameData {
  settings: Settings;
  isSettingsOpen: boolean;
  isDiceRollerOpen: boolean;
  isAudioPlayerOpen: boolean;
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
  setAudioUrl: (url: string) => void;
  setPanelOrder: (order: PanelType[]) => void;
  setPanelSizes: (sizes: number[]) => void;
  setSettings: (settings: Partial<Settings>) => void;
  updateLogEntry: (id: string, newContent: string) => void;
  regenerateFrom: (id: string) => void;
  
  // Toast Actions
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;

  // History Actions
  // undo and redo are handled by zundo middleware and custom hooks
}