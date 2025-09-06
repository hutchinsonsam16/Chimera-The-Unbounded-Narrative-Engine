export enum GamePhase {
  ONBOARDING = 'ONBOARDING',
  PLAYING = 'PLAYING',
}

export enum GenerationService {
  CLOUD = 'cloud',
  LOCAL = 'local',
  LOCAL_API = 'local_api'
}

export interface Location {
    name: string;
    x: number;
    y: number;
    status: 'discovered' | 'ruined' | 'conquered' | 'hidden';
}

export interface MapPath {
    start: string; // location name
    end: string;   // location name
    style: 'solid' | 'dotted' | 'dashed';
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
  id:string;
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
  lore: string;
  npcs: NPC[];
  knowledgeBase: KnowledgeBase;
  interNpcRelationships: { [npcId: string]: { [otherNpcId: string]: number } };
  locations: Record<string, Location>;
  mapPaths: MapPath[];
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
  isCustom: boolean;
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

export interface Persona {
    id: string;
    name: string;
    prompt: string;
}

export type ImageGenerationContext = 'character' | 'npc' | 'scene' | 'creature';

export type CreditSystemMode = 'off' | 'limited' | 'unlimited';

export interface Settings {
  appName: string;
  engine: {
    service: GenerationService;
    localApi: {
        baseUrl: string;
        apiKey: string;
    };
    imageModelAssignments: Record<ImageGenerationContext, string>;
    local: {
      textModel: string;
      imageModel: string;
      imageQuality: LocalImageModelQuality;
    };
    cloud: {
      textModel: string;
      imageModel: string;
      personas: Persona[];
      activePersonaId: string | null;
    };
  };
  layout: {
    panelOrder: PanelType[];
    panelSizes: number[];
  };
  gameplay: {
      promptAssist: boolean;
      costs: {
        textGeneration: number;
        imageGeneration: number;
        imageEdit: number;
        suggestion: number;
      }
  };
  creditSystem: {
      enabled: boolean;
      mode: CreditSystemMode;
      tiers: {
          limited: number;
          pro: number;
      }
  };
  performance: {
      resourceLimit: number; // Percentage
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
  themes: Theme[];
  activeThemeName: string;
  hasCompletedTutorial: boolean;
  characterVoiceSample: string;
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

export type ExportFormat = 'zip' | 'txt' | 'html';

export type ApiKeyStatus = 'unvalidated' | 'validating' | 'valid' | 'invalid';

export interface AppState extends GameData {
  settings: Settings;
  snapshots: Snapshot[];
  credits: {
      current: number;
      max: number;
  };
  isSettingsOpen: boolean;
  isDiceRollerOpen: boolean;
  isAudioPlayerOpen: boolean;
  isCommandPaletteOpen: boolean;
  isExportModalOpen: boolean;
  isImageEditorOpen: { open: boolean, logEntryId: string | null };
  audioUrl: string;
  toasts: Toast[];
  apiKeyStatus: ApiKeyStatus;
  apiKey: string | null;
  
  // Actions
  handlePlayerAction: (action: string) => Promise<void>;
  parseAndApplyTags: (rawResponse: string) => Promise<string>;
  startGame: (worldConcept: string, charName: string, charBackstory: string, openingPrompt: string, charImageBase64?: string | null) => void;
  saveGame: () => void;
  loadGame: (file: File) => void;
  exportGame: (format: ExportFormat) => Promise<void>;
  exportCharacterSheet: () => void;
  restartGame: () => void;
  
  // UI Actions
  toggleSettings: () => void;
  toggleDiceRoller: () => void;
  toggleAudioPlayer: () => void;
  toggleCommandPalette: () => void;
  toggleExportModal: () => void;
  toggleImageEditor: (logEntryId?: string) => void;
  setAudioUrl: (url: string) => void;
  setPanelOrder: (order: PanelType[]) => void;
  setPanelSizes: (sizes: number[]) => void;
  setSettings: (settings: Partial<Settings> | ((current: Settings) => Partial<Settings>)) => void;
  updateLogEntry: (id: string, newContent: string) => void;
  regenerateFrom: (id: string) => void;
  generateCharacterPortrait: () => Promise<void>;

  // V3 Actions
  suggestPlayerAction: () => Promise<string[]>;
  editImage: (logEntryId: string, prompt: string, mode: 'in-paint' | 'out-paint', maskDataUrl?: string, imageOverrideBase64?: string) => Promise<void>;
  
  // Persona Actions
  addPersona: (persona: Omit<Persona, 'id'>) => void;
  updatePersona: (persona: Persona) => void;
  deletePersona: (id: string) => void;
  setActivePersona: (id: string) => void;

  // Snapshot Actions
  createSnapshot: (name: string) => void;
  loadSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
  
  // Toast Actions
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;

  // Tutorial Actions
  completeTutorial: () => void;

  // API Key Actions
  validateApiKey: (key?: string) => Promise<void>;
  switchToLocalMode: () => void;
  setUserApiKey: (key: string) => void;

  // Theme actions
  addTheme: (theme: Theme) => void;
  updateTheme: (theme: Theme) => void;
  deleteTheme: (name: string) => void;
  setActiveTheme: (name: string) => void;
}
