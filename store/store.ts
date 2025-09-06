import type { StateCreator } from 'zustand';
import { temporal } from 'zundo';
import { AppState, GamePhase, NPC, PanelType, Settings, StoryLogEntry, GameData, Toast, Quest, KnowledgeBaseEntry, Snapshot, Persona, ExportFormat, GenerationService } from '../types';
import { INITIAL_STATE, INITIAL_GAME_DATA } from '../constants';
import { generateTextStream, generateImage, generateEnhancedPrompt, suggestActionFromContext, editImageWithMask, generateOnboardingFromImage, checkApiKey, setUserApiKey } from '../services/geminiService';
import { generateLocalText, generateLocalImage } from '../services/localGenerationService';
import { nanoid } from 'nanoid';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import * as FileSaver from 'file-saver';
import { toBase64 } from '../lib/utils';

// Define the part of the state we want to track for undo/redo
const historySlice: StateCreator<AppState, [], [], AppState> = (set, get) => ({
  ...INITIAL_STATE,

  // API Key Actions
  validateApiKey: async () => {
    if (get().settings.engine.service !== GenerationService.CLOUD) {
        set({ apiKeyStatus: 'valid' });
        return;
    }
    set({ apiKeyStatus: 'validating' });
    const isValid = await checkApiKey();
    set({ apiKeyStatus: isValid ? 'valid' : 'invalid' });
  },

  switchToLocalMode: () => {
    get().setSettings({ 
        ...get().settings, 
        engine: { ...get().settings.engine, service: GenerationService.LOCAL } 
    });
    set({ apiKeyStatus: 'valid' });
    get().addToast("Switched to Local AI Mode.", "info");
  },

  setApiKey: (key: string) => {
    setUserApiKey(key);
    get().validateApiKey();
  },

  // UI Actions
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
  toggleDiceRoller: () => set(state => ({ isDiceRollerOpen: !state.isDiceRollerOpen })),
  toggleAudioPlayer: () => set(state => ({ isAudioPlayerOpen: !state.isAudioPlayerOpen })),
  toggleCommandPalette: () => set(state => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  toggleExportModal: () => set(state => ({ isExportModalOpen: !state.isExportModalOpen })),
  toggleImageEditor: (logEntryId) => set(state => ({ isImageEditorOpen: { open: !state.isImageEditorOpen.open, logEntryId: logEntryId || null }})),
  setAudioUrl: (url: string) => set({ audioUrl: url }),

  setPanelOrder: (order: PanelType[]) => set((state) => ({ settings: { ...state.settings, layout: { ...state.settings.layout, panelOrder: order } } })),
  setPanelSizes: (sizes: number[]) => set((state) => ({ settings: { ...state.settings, layout: { ...state.settings.layout, panelSizes: sizes } } })),
  setSettings: (newSettings: Partial<Settings>) => set(state => ({ settings: { ...state.settings, ...newSettings }})),

  addToast: (message, type = 'info') => {
      const newToast: Toast = { id: nanoid(), message, type };
      set(state => ({ toasts: [...state.toasts, newToast] }));
      setTimeout(() => get().removeToast(newToast.id), 5000);
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),

  // Game Logic Actions
  restartGame: () => {
    set({ ...INITIAL_STATE });
    const { clear } = (get() as any).temporal.getState();
    clear();
  },

  startGame: async (worldConcept: string, charName: string, charBackstory: string, openingPrompt: string, charImageBase64?: string | null) => {
    let initialImageUrl = `https://picsum.photos/seed/char/512/512`;
    let initialHistory: { url: string; prompt: string }[] = [];

    if (charImageBase64) {
      initialImageUrl = `data:image/jpeg;base64,${charImageBase64}`;
      initialHistory.push({ url: initialImageUrl, prompt: "Initial character image." });
    }

    set({
      ...INITIAL_GAME_DATA,
      character: {
        ...INITIAL_GAME_DATA.character,
        name: charName,
        backstory: charBackstory,
        imageUrl: initialImageUrl,
        imageUrlHistory: initialHistory,
      },
      world: {
        ...INITIAL_GAME_DATA.world,
        lore: worldConcept,
      },
      gameState: {
        ...INITIAL_GAME_DATA.gameState,
        phase: GamePhase.PLAYING,
        storyLog: [
          { id: nanoid(), type: 'system', content: `The story begins. World: ${worldConcept}. Character: ${charName}.`, timestamp: new Date().toISOString() }
        ],
      },
    });

    if (!charImageBase64) {
      await get().generateCharacterPortrait();
    }
    
    get().handlePlayerAction(openingPrompt);
  },

  handlePlayerAction: async (action: string) => {
    if (get().gameState.isLoading) return;
    
    const cost = get().settings.gameplay.costs.textGeneration;
    if (get().credits < cost) {
        get().addToast(`Not enough credits. Need ${cost}, have ${get().credits}.`, 'error');
        return;
    }

    let finalAction = action;
    const { settings } = get();

    if (settings.gameplay.promptAssist && settings.engine.service === 'cloud') {
        try {
            finalAction = await generateEnhancedPrompt(action);
            get().addToast(`Used enhanced prompt: "${finalAction}"`, 'info');
        } catch (e) {
            console.error("Prompt assist failed:", e);
            get().addToast("Prompt assist failed. Using original prompt.", 'error');
        }
    }

    set(state => ({
      gameState: {
        ...state.gameState,
        isLoading: true,
        storyLog: [
          ...state.gameState.storyLog,
          { id: nanoid(), type: 'player', content: action, timestamp: new Date().toISOString() },
        ],
      },
    }));

    const { character, world, gameState } = get();
    
    const fullPrompt = `GAME STATE:\nCharacter: ${JSON.stringify(character)}\nWorld: ${JSON.stringify(world)}\nTimeline: ${JSON.stringify(gameState.timeline)}\nQuests: ${JSON.stringify(gameState.quests)}\nLatest Events: ${gameState.storyLog.slice(-5).map(e => `${e.type}: ${e.content}`).join('\n')}\n\nPLAYER ACTION: "${finalAction}"`;

    try {
      if (settings.engine.service === 'cloud') {
        const stream = await generateTextStream(fullPrompt);
        const narrativeEntryId = nanoid();
        
        set(state => ({ gameState: { ...state.gameState, storyLog: [...state.gameState.storyLog, { id: narrativeEntryId, type: 'narrative', content: '', timestamp: new Date().toISOString() }] }}));
        
        let fullResponse = "";
        for await (const chunk of stream) {
          fullResponse += chunk;
          set(state => ({
              gameState: {
                  ...state.gameState,
                  storyLog: state.gameState.storyLog.map(e => e.id === narrativeEntryId ? { ...e, content: fullResponse } : e)
              }
          }));
        }
        
        const cleanNarrative = await get().parseAndApplyTags(fullResponse);
        set(state => ({
            gameState: {
              ...state.gameState,
              storyLog: state.gameState.storyLog.map(e => e.id === narrativeEntryId ? { ...e, content: cleanNarrative } : e)
            }
        }));

      } else {
        const rawResponse = await generateLocalText(fullPrompt);
        const cleanNarrative = await get().parseAndApplyTags(rawResponse);
        set(state => ({
            gameState: {
                ...state.gameState,
                storyLog: [...state.gameState.storyLog, { id: nanoid(), type: 'narrative', content: cleanNarrative, timestamp: new Date().toISOString() }],
            },
        }));
      }
      set(state => ({ credits: state.credits - cost }));
    } catch (error) {
      console.error("Error generating response:", error);
      get().addToast("Error: Could not get a response from the AI.", 'error');
    } finally {
      set(state => ({ gameState: { ...state.gameState, isLoading: false } }));
    }
  },

  parseAndApplyTags: async (rawResponse: string): Promise<string> => {
    let narrativeText = rawResponse;
    const tagRegex = /<([a-zA-Z_]+)([^>]*)>([\s\S]*?)<\/\1>|<([a-zA-Z_]+)([^>]*)\/>/g;
    let match;
    const imagePromises: Promise<void>[] = [];

    const getAttrs = (attrStr: string): { [key: string]: string } => {
        const attributes: { [key:string]: string } = {};
        const attrRegex = /(\w+)="([^"]*)"/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
            attributes[attrMatch[1]] = attrMatch[2];
        }
        return attributes;
    };

    while ((match = tagRegex.exec(rawResponse)) !== null) {
      const [fullMatch, tagName, attrs, content, selfClosingTagName, selfClosingAttrs] = match;
      narrativeText = narrativeText.replace(fullMatch, '').trim();

      const currentTagName = tagName || selfClosingTagName;
      const currentAttrs = attrs || selfClosingAttrs;
      const currentContent = content || '';
      const attributes = getAttrs(currentAttrs);
      
      switch (currentTagName) {
        case 'char_inventory_add': set(state => ({ character: { ...state.character, inventory: [...new Set([...state.character.inventory, currentContent])] } })); break;
        case 'gen_image': {
            const imagePrompt = currentContent;
            if (!imagePrompt) break;
            const placeholderId = nanoid();
            const placeholderEntry: StoryLogEntry = { id: placeholderId, type: 'image', content: 'generating...', prompt: imagePrompt, timestamp: new Date().toISOString() };
            set(state => ({ gameState: { ...state.gameState, storyLog: [...state.gameState.storyLog, placeholderEntry] }})); 

            const promise = (async () => {
                try {
                    const b64Image = await generateImage(imagePrompt);
                    const imageUrl = `data:image/jpeg;base64,${b64Image}`;
                    set(state => ({ gameState: { ...state.gameState, storyLog: state.gameState.storyLog.map(e => e.id === placeholderId ? { ...e, content: imageUrl } : e) }})); 
                } catch (e) {
                    console.error("Image generation failed:", e);
                    set(state => ({ gameState: { ...state.gameState, storyLog: state.gameState.storyLog.map(e => e.id === placeholderId ? { ...e, content: 'Image generation failed.' } : e) }})); 
                }
            })();
            imagePromises.push(promise);
            break;
          }
        }
    }
    await Promise.all(imagePromises);
    return narrativeText;
  },

  // ... (rest of the actions remain the same)

  updateLogEntry: (id, newContent) => {
    set(state => ({
        gameState: {
            ...state.gameState,
            storyLog: state.gameState.storyLog.map(entry => entry.id === id ? { ...entry, content: newContent } : entry)
        }
    }));
  },

  regenerateFrom: (id: string) => {
      const { storyLog } = get().gameState;
      const entryIndex = storyLog.findIndex(e => e.id === id);
      if (entryIndex === -1 || storyLog[entryIndex].type !== 'player') {
          get().addToast("Can only regenerate from a player action.", "error");
          return;
      }
      const newStoryLog = storyLog.slice(0, entryIndex + 1);
      set(state => ({ gameState: { ...state.gameState, storyLog: newStoryLog } }));
      get().handlePlayerAction(storyLog[entryIndex].content);
  },
  
  generateCharacterPortrait: async () => {
    if (get().gameState.isLoading) return;

    const cost = get().settings.gameplay.costs.imageGeneration;
    if (get().credits < cost) {
        get().addToast(`Not enough credits for portrait. Need ${cost}.`, 'error');
        return;
    }

    set(state => ({ gameState: { ...state.gameState, isLoading: true }}));
    get().addToast('Generating new character portrait...', 'info');

    try {
        const { character } = get();
        const autoPrompt = `Full body portrait of ${character.name}, a character whose status is ${JSON.stringify(character.status)}. They are carrying: ${character.inventory.join(', ')}.`;
        
        const b64Image = await generateImage(autoPrompt);
        const imageUrl = `data:image/jpeg;base64,${b64Image}`;
        set(state => ({ 
            character: { 
                ...state.character, 
                imageUrl, 
                imageUrlHistory: [...state.character.imageUrlHistory, { url: imageUrl, prompt: autoPrompt }] 
            },
            credits: state.credits - cost,
        }));
        get().addToast('Character portrait updated!', 'success');
    } catch (e) {
        console.error("Manual portrait generation failed:", e);
        get().addToast('Portrait generation failed.', 'error');
    } finally {
        set(state => ({ gameState: { ...state.gameState, isLoading: false }}));
    }
  },

  suggestPlayerAction: async () => {
    const cost = get().settings.gameplay.costs.suggestion;
    if (get().credits < cost) {
        get().addToast(`Not enough credits for suggestion. Need ${cost}.`, 'error');
        return [];
    }
    set(state => ({ gameState: { ...state.gameState, isLoading: true }}));
    try {
        const { character, gameState } = get();
        const context = `Character: ${JSON.stringify(character)}\n\nRecent Events:\n${gameState.storyLog.slice(-5).map(e => e.content).join('\n---\n')}`;
        const suggestions = await suggestActionFromContext(context);
        set(state => ({ credits: state.credits - cost }));
        return suggestions;
    } catch (e) {
        console.error("Failed to get suggestions:", e);
        get().addToast('Failed to get suggestions.', 'error');
        return [];
    } finally {
        set(state => ({ gameState: { ...state.gameState, isLoading: false }}));
    }
  },

  editImage: async (logEntryId, prompt, mode, maskDataUrl, imageOverrideBase64) => {
    const cost = get().settings.gameplay.costs.imageEdit;
    if (get().credits < cost) {
        get().addToast(`Not enough credits for image edit. Need ${cost}.`, 'error');
        return;
    }

    const originalEntry = get().gameState.storyLog.find(e => e.id === logEntryId);
    if (!originalEntry || originalEntry.type !== 'image' || !originalEntry.content.startsWith('data:')) {
        get().addToast('Original image not found or invalid.', 'error');
        return;
    }
    set(state => ({ gameState: { ...state.gameState, isLoading: true }}));
    try {
        const imageToSendBase64 = imageOverrideBase64 || originalEntry.content.split(',')[1];
        const maskBase64 = maskDataUrl ? maskDataUrl.split(',')[1] : undefined;

        const { image: newImageBase64 } = await editImageWithMask(prompt, imageToSendBase64, maskBase64);
        
        const newImageUrl = `data:image/jpeg;base64,${newImageBase64}`;
        const newLogEntry: StoryLogEntry = {
            id: nanoid(),
            type: 'image',
            content: newImageUrl,
            prompt: `(Edit of: ${originalEntry.prompt}) ${prompt}`,
            timestamp: new Date().toISOString()
        };

        set(state => ({
            gameState: {
                ...state.gameState,
                storyLog: [...state.gameState.storyLog, newLogEntry]
            },
            credits: state.credits - cost,
        }));
        get().addToast("Image successfully edited!", 'success');

    } catch (e) {
        console.error("Failed to edit image:", e);
        get().addToast("Image editing failed.", "error");
    } finally {
        set(state => ({ gameState: { ...state.gameState, isLoading: false }}));
    }
  },

  addPersona: (personaData) => {
      const newPersona: Persona = { ...personaData, id: nanoid() };
      set(state => ({
          settings: { ...state.settings, engine: { ...state.settings.engine, cloud: { ...state.settings.engine.cloud, personas: [...state.settings.engine.cloud.personas, newPersona] }}}
      }));
  },
  updatePersona: (personaToUpdate) => {
      set(state => ({
          settings: { ...state.settings, engine: { ...state.settings.engine, cloud: { ...state.settings.engine.cloud, personas: state.settings.engine.cloud.personas.map(p => p.id === personaToUpdate.id ? personaToUpdate : p) }}}
      }));
  },
  deletePersona: (id) => {
      set(state => {
          const newPersonas = state.settings.engine.cloud.personas.filter(p => p.id !== id);
          let newActiveId = state.settings.engine.cloud.activePersonaId;
          if (newActiveId === id) {
              newActiveId = newPersonas.length > 0 ? newPersonas[0].id : null;
          }
          return {
              settings: { ...state.settings, engine: { ...state.settings.engine, cloud: { ...state.settings.engine.cloud, personas: newPersonas, activePersonaId: newActiveId }}}
          }
      })
  },
  setActivePersona: (id) => {
      set(state => ({
          settings: { ...state.settings, engine: { ...state.settings.engine, cloud: { ...state.settings.engine.cloud, activePersonaId: id }}}
      }));
  },
  
  completeTutorial: () => {
      set(state => ({ settings: { ...state.settings, hasCompletedTutorial: true }}));
  },

  createSnapshot: (name) => {
      const { character, world, gameState } = get();
      const gameData: GameData = { character, world, gameState: { ...gameState, isLoading: false } };
      const newSnapshot: Snapshot = {
          id: nanoid(),
          name,
          createdAt: new Date().toISOString(),
          data: JSON.parse(JSON.stringify(gameData))
      };
      set(state => ({ snapshots: [...state.snapshots, newSnapshot]}));
      get().addToast(`Snapshot "${name}" created!`, "success");
  },

  loadSnapshot: (id) => {
      const snapshot = get().snapshots.find(s => s.id === id);
      if (snapshot) {
          set({ ...snapshot.data });
           const { clear } = (get() as any).temporal.getState();
           clear();
          get().addToast(`Snapshot "${snapshot.name}" loaded!`, "success");
      } else {
          get().addToast("Snapshot not found.", "error");
      }
  },

  deleteSnapshot: (id) => {
      set(state => ({ snapshots: state.snapshots.filter(s => s.id !== id) }));
      get().addToast("Snapshot deleted.", "info");
  },

  saveGame: () => {
    const { character, world, gameState, snapshots, settings, credits } = get();
    const saveState = { version: '3.0.0', savedAt: new Date().toISOString(), character, world, gameState: { ...gameState, isLoading: false }, snapshots, settings, credits };
    const blob = new Blob([JSON.stringify(saveState, null, 2)], { type: 'application/json' });
    FileSaver.saveAs(blob, `chimera-save-${Date.now()}.json`);
    get().addToast("Game Saved!", "success");
  },

  loadGame: (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const savedData = JSON.parse(event.target?.result as string);
        if (savedData.version && savedData.character && savedData.world && savedData.gameState) {
            set({ 
                character: savedData.character, 
                world: savedData.world, 
                gameState: { ...savedData.gameState, phase: GamePhase.PLAYING }, 
                snapshots: savedData.snapshots || [],
                settings: savedData.settings || get().settings,
                credits: savedData.credits || 100,
            });
            get().addToast("Game Loaded Successfully!", "success");
        } else { throw new Error("Invalid save file format."); }
      } catch (e) {
        console.error("Failed to load game:", e);
        get().addToast("Failed to load save file.", "error");
      }
    };
    reader.readAsText(file);
  },

  exportCharacterSheet: () => {
    const { character } = get();
    const pdf = new jsPDF();
    pdf.text(`Name: ${character.name}`, 10, 10);
    pdf.text(`Backstory: ${character.backstory}`, 10, 20);
    pdf.save("character_sheet.pdf");
  },

  exportGame: async (format: ExportFormat) => {
    const { character, world, gameState } = get();
    if(format === 'txt'){
        const text = gameState.storyLog.map(entry => `${entry.type}: ${entry.content}`).join('\n');
        const blob = new Blob([text], {type: "text/plain;charset=utf-8"});
        FileSaver.saveAs(blob, "story.txt");
    } else { // zip
        const zip = new JSZip();
        zip.file("story.json", JSON.stringify(gameState.storyLog));
        zip.file("character.json", JSON.stringify(character));
        zip.file("world.json", JSON.stringify(world));
        const content = await zip.generateAsync({type:"blob"});
        FileSaver.saveAs(content, "export.zip");
    }
  },
});


export const createRootSlice = temporal(historySlice, {
    partialize: (state) => {
        const { character, world, gameState } = state;
        return { character, world, gameState };
    },
    equality: (pastState, currentState) => JSON.stringify(pastState) === JSON.stringify(currentState),
});