
import type { StateCreator, StoreApi } from 'zustand';
import { temporal, TemporalState } from 'zundo';
import { AppState, GamePhase, NPC, PanelType, Settings, StoryLogEntry, GameData, Toast } from '../types';
import { INITIAL_STATE, INITIAL_GAME_DATA } from '../constants';
import { generateTextStream, generateImage } from '../services/geminiService';
import { generateLocalText, generateLocalImage } from '../services/localGenerationService';
import { nanoid } from 'nanoid';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import * as FileSaver from 'file-saver';
import { toBase64 } from '../lib/utils';

// Define the part of the state we want to track for undo/redo
const historySlice: StateCreator<AppState, [], [], AppState> = (set, get) => ({
  ...INITIAL_STATE,

  // UI Actions (not part of history)
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
  toggleDiceRoller: () => set(state => ({ isDiceRollerOpen: !state.isDiceRollerOpen })),
  toggleAudioPlayer: () => set(state => ({ isAudioPlayerOpen: !state.isAudioPlayerOpen })),
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
    // FIX: Correctly access the temporal state to clear history. The previous type cast was incorrect.
    const { clear } = (get() as any).temporal.getState();
    clear();
  },

  startGame: (worldConcept, charName, charBackstory, openingPrompt) => {
    set({
      ...INITIAL_GAME_DATA,
      character: {
        ...INITIAL_GAME_DATA.character,
        name: charName,
        backstory: charBackstory,
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
    get().handlePlayerAction(openingPrompt);
  },

  handlePlayerAction: async (action: string) => {
    if (get().gameState.isLoading) return;

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

    const { settings, character, world, gameState } = get();
    
    const fullPrompt = `GAME STATE:\nCharacter: ${JSON.stringify(character)}\nWorld: ${JSON.stringify(world)}\nTimeline: ${JSON.stringify(gameState.timeline)}\nLatest Events: ${gameState.storyLog.slice(-5).map(e => `${e.type}: ${e.content}`).join('\n')}\n\nPLAYER ACTION: "${action}"`;

    try {
      if (settings.engine.service === 'cloud') {
        const stream = await generateTextStream(fullPrompt);
        const narrativeEntryId = nanoid();
        
        // Add a placeholder for the streaming response
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
        if (cleanNarrative) {
          set(state => ({
              gameState: {
                  ...state.gameState,
                  storyLog: [...state.gameState.storyLog, { id: nanoid(), type: 'narrative', content: cleanNarrative, timestamp: new Date().toISOString() }],
              },
          }));
        }
      }
    } catch (error) {
      console.error("Error generating response:", error);
      get().addToast("Error: Could not get a response from the AI.", 'error');
    } finally {
      set(state => ({ gameState: { ...state.gameState, isLoading: false } }));
    }
  },

  parseAndApplyTags: async (rawResponse: string): Promise<string> => {
    let narrativeText = rawResponse;
    const tagRegex = /<([a-zA-Z_]+)([^>]*)>([\s\S]*?)<\/\1>/g;
    let match;
    const imagePromises: Promise<void>[] = [];

    while ((match = tagRegex.exec(rawResponse)) !== null) {
      const [fullMatch, tagName, attrs, content] = match;
      narrativeText = narrativeText.replace(fullMatch, '').trim();

      const getAttrs = (attrStr: string): { [key: string]: string } => {
          const attributes: { [key: string]: string } = {};
          const attrRegex = /(\w+)="([^"]*)"/g;
          let attrMatch;
          while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
              attributes[attrMatch[1]] = attrMatch[2];
          }
          return attributes;
      };

      const attributes = getAttrs(attrs);

      switch (tagName) {
        case 'char_name': set(state => ({ character: { ...state.character, name: content } })); break;
        case 'char_backstory': set(state => ({ character: { ...state.character, backstory: content } })); break;
        case 'char_skill_add': if (attributes.key) set(state => ({ character: { ...state.character, skills: { ...state.character.skills, [attributes.key]: content } } })); break;
        case 'char_skill_remove': if (attributes.key) set(state => { const newSkills = { ...state.character.skills }; delete newSkills[attributes.key]; return { character: { ...state.character, skills: newSkills } }; }); break;
        case 'char_inventory_add': set(state => ({ character: { ...state.character, inventory: [...new Set([...state.character.inventory, content])] } })); break;
        case 'char_inventory_remove': set(state => ({ character: { ...state.character, inventory: state.character.inventory.filter(item => item !== content) } })); break;
        case 'char_status_update': if (attributes.key) set(state => ({ character: { ...state.character, status: { ...state.character.status, [attributes.key]: content } } })); break;
        case 'world_lore': set(state => ({ world: { ...state.world, lore: state.world.lore + '\n\n' + content } })); break;
        case 'add_npc': try { const npc = JSON.parse(content) as NPC; set(state => ({ world: { ...state.world, npcs: [...state.world.npcs, npc] } })); } catch (e) { console.error('Failed to parse NPC JSON:', content); } break;
        case 'update_npc': if (attributes.id) try { const updates = JSON.parse(content); set(state => ({ world: { ...state.world, npcs: state.world.npcs.map(npc => npc.id === attributes.id ? { ...npc, ...updates } : npc) } })); } catch (e) { console.error('Failed to parse NPC update JSON:', content); } break;
        case 'gen_image': case 'gen_char_image':
            const isCharImage = tagName === 'gen_char_image';
            const imagePrompt = content;
            const placeholderId = nanoid();
            const placeholderEntry: StoryLogEntry = { id: placeholderId, type: 'image', content: 'generating...', prompt: imagePrompt, timestamp: new Date().toISOString() };
            if (!isCharImage) { set(state => ({ gameState: { ...state.gameState, storyLog: [...state.gameState.storyLog, placeholderEntry] }})); }
            const promise = (async () => {
                try {
                    const { service } = get().settings.engine;
                    const b64Image = service === 'cloud' ? await generateImage(imagePrompt) : await generateLocalImage(imagePrompt);
                    const imageUrl = `data:image/jpeg;base64,${b64Image}`;
                    if (isCharImage) { set(state => ({ character: { ...state.character, imageUrl, imageUrlHistory: [...state.character.imageUrlHistory, { url: imageUrl, prompt: imagePrompt }] }})); } 
                    else { set(state => ({ gameState: { ...state.gameState, storyLog: state.gameState.storyLog.map(e => e.id === placeholderId ? { ...e, content: imageUrl } : e) }})); }
                } catch (e) {
                    console.error("Image generation failed:", e);
                    get().addToast('Image generation failed.', 'error');
                    const errorContent = 'Image generation failed.';
                    if (!isCharImage) { set(state => ({ gameState: { ...state.gameState, storyLog: state.gameState.storyLog.map(e => e.id === placeholderId ? { ...e, content: errorContent } : e) }})); }
                }
            })();
            imagePromises.push(promise);
            break;
        }
    }
    await Promise.all(imagePromises);
    return narrativeText;
  },

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

      // Truncate the log
      const newStoryLog = storyLog.slice(0, entryIndex);
      const actionToRegen = storyLog[entryIndex].content;
      
      // Need a way to revert state to this point. The undo/redo history is perfect.
      // This is a complex operation that requires careful state time-travel.
      // For now, we just re-run the action from the current state.
      // A more robust implementation would use state snapshots.
      set(state => ({
          gameState: { ...state.gameState, storyLog: newStoryLog }
      }));
      get().handlePlayerAction(actionToRegen);
  },

  saveGame: () => {
    const { character, world, gameState } = get();
    const saveState = { version: '1.0.0', savedAt: new Date().toISOString(), character, world, gameState: { ...gameState, isLoading: false } };
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
            set({ character: savedData.character, world: savedData.world, gameState: { ...savedData.gameState, phase: GamePhase.PLAYING } });
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
    try {
        const pdf = new jsPDF();
        pdf.setFont("Helvetica", "bold");
        pdf.setFontSize(24);
        pdf.text(character.name, 105, 20, { align: 'center' });

        let y = 40;
        const printSection = (title: string, content: any) => {
            pdf.setFontSize(16);
            pdf.setFont("Helvetica", "bold");
            pdf.text(title, 20, y);
            y += 8;
            pdf.setFontSize(12);
            pdf.setFont("Helvetica", "normal");
            if (typeof content === 'string') {
                 const lines = pdf.splitTextToSize(content, 170);
                 pdf.text(lines, 20, y);
                 y += lines.length * 5 + 5;
            } else if (Array.isArray(content)) {
                content.forEach(item => { pdf.text(`- ${item}`, 25, y); y += 6; });
            } else if (typeof content === 'object') {
                 Object.entries(content).forEach(([key, value]) => { pdf.text(`${key}: ${value}`, 25, y); y += 6; });
            }
            y += 5;
        };

        printSection("Backstory", character.backstory);
        printSection("Status", character.status);
        printSection("Skills", character.skills);
        printSection("Inventory", character.inventory);
        
        pdf.save(`${character.name.replace(/\s+/g, '_')}_Sheet.pdf`);
        get().addToast("Character Sheet Exported!", "success");
    } catch(e) {
        console.error("Failed to export character sheet", e);
        get().addToast("Failed to export character sheet.", "error");
    }
  },

  exportGame: async () => {
    set(state => ({ gameState: { ...state.gameState, isLoading: true }}));
    try {
        const { character, world, gameState, settings } = get();
        const zip = new JSZip();
        zip.file('save.json', JSON.stringify({ version: '1.0.0', character, world, gameState, settings }, null, 2));

        const imagePrompts: string[] = [];
        const imageFolder = zip.folder('images');
        let imageCounter = 1;

        const addImageToZip = async (url: string, prompt: string) => {
            if (!url.startsWith('data:image')) return;
            const b64data = url.split(',')[1];
            imagePrompts.push(`image_${imageCounter}.jpg: ${prompt}`);
            imageFolder?.file(`image_${imageCounter}.jpg`, b64data, { base64: true });
            imageCounter++;
        };

        for (const img of character.imageUrlHistory) { await addImageToZip(img.url, img.prompt); }

        const pdf = new jsPDF();
        pdf.setFont("Helvetica");
        pdf.setFontSize(12);
        let yPos = 15;
        const pageHeight = pdf.internal.pageSize.height - 20;
        
        pdf.text(`${settings.appName} Saga`, 10, yPos);
        yPos += 10;

        for (const entry of gameState.storyLog) {
             const content = entry.content.startsWith('data:image') ? `(See image_${imageCounter}.jpg)` : entry.content;
             const textLines = pdf.splitTextToSize(`[${entry.type}] ${content}`, 180);
             if (yPos + (textLines.length * 7) > pageHeight) { pdf.addPage(); yPos = 15; }
             pdf.text(textLines, 10, yPos);
             yPos += textLines.length * 7 + 5;
             if (entry.type === 'image' && entry.content.startsWith('data:image')) { await addImageToZip(entry.content, entry.prompt || 'N/A'); }
        }
        
        zip.file('prompts.txt', imagePrompts.join('\n'));
        zip.file('story.pdf', pdf.output('blob'));
        const content = await zip.generateAsync({ type: 'blob' });
        FileSaver.saveAs(content, `chimera-export-${Date.now()}.zip`);
        get().addToast("Saga Exported Successfully!", "success");

    } catch (e) {
        console.error("Failed to export game:", e);
        get().addToast("An error occurred during export.", "error");
    } finally {
        set(state => ({ gameState: { ...state.gameState, isLoading: false }}));
    }
  },
});


// FIX: Removed explicit StateCreator type to allow for type inference of middleware-augmented state.
export const createRootSlice = temporal(historySlice, {
    partialize: (state) => {
        const { character, world, gameState } = state;
        return { character, world, gameState };
    },
    equality: (pastState, currentState) => JSON.stringify(pastState) === JSON.stringify(currentState),
});