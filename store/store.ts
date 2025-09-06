import type { StateCreator } from 'zustand';
import { temporal } from 'zundo';
import { AppState, GamePhase, NPC, PanelType, Settings, StoryLogEntry, GameData, Toast, Quest, KnowledgeBaseEntry, Snapshot } from '../types';
import { INITIAL_STATE, INITIAL_GAME_DATA } from '../constants';
import { generateTextStream, generateImage, generateEnhancedPrompt } from '../services/geminiService';
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
  toggleCommandPalette: () => set(state => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
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
          { id: nanoid(), type: 'player', content: action, timestamp: new Date().toISOString() }, // Log the original action
        ],
      },
    }));

    const { character, world, gameState } = get();
    
    const fullPrompt = `GAME STATE:\nCharacter: ${JSON.stringify(character)}\nWorld: ${JSON.stringify(world)}\nTimeline: ${JSON.stringify(gameState.timeline)}\nQuests: ${JSON.stringify(gameState.quests)}\nLatest Events: ${gameState.storyLog.slice(-5).map(e => `${e.type}: ${e.content}`).join('\n')}\n\nPLAYER ACTION: "${finalAction}"`;

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
    const tagRegex = /<([a-zA-Z_]+)([^>]*)>([\s\S]*?)<\/\1>|<([a-zA-Z_]+)([^>]*)\/>/g;
    let match;
    const imagePromises: Promise<void>[] = [];
    let significantChange = false;

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
        case 'char_name': set(state => ({ character: { ...state.character, name: currentContent } })); break;
        case 'char_backstory': set(state => ({ character: { ...state.character, backstory: currentContent } })); break;
        case 'char_skill_add': if (attributes.key) set(state => ({ character: { ...state.character, skills: { ...state.character.skills, [attributes.key]: currentContent } } })); break;
        case 'char_skill_remove': if (attributes.key) set(state => { const newSkills = { ...state.character.skills }; delete newSkills[attributes.key]; return { character: { ...state.character, skills: newSkills } }; }); break;
        case 'char_inventory_add': set(state => ({ character: { ...state.character, inventory: [...new Set([...state.character.inventory, currentContent])] } })); significantChange = true; break;
        case 'char_inventory_remove': set(state => ({ character: { ...state.character, inventory: state.character.inventory.filter(item => item !== currentContent) } })); significantChange = true; break;
        case 'char_status_update': if (attributes.key) { set(state => ({ character: { ...state.character, status: { ...state.character.status, [attributes.key]: currentContent } } })); significantChange = true; } break;
        case 'world_lore': set(state => ({ world: { ...state.world, lore: state.world.lore + '\n\n' + currentContent } })); break;
        case 'add_npc': try { const npc = JSON.parse(currentContent) as NPC; set(state => ({ world: { ...state.world, npcs: [...state.world.npcs, npc] } })); } catch (e) { console.error('Failed to parse NPC JSON:', currentContent); } break;
        case 'update_npc': if (attributes.id) try { const updates = JSON.parse(currentContent); set(state => ({ world: { ...state.world, npcs: state.world.npcs.map(npc => npc.id === attributes.id ? { ...npc, ...updates } : npc) } })); } catch (e) { console.error('Failed to parse NPC update JSON:', currentContent); } break;
        
        // New V2 Tags
        case 'quest_add': if(attributes.title) { const newQuest: Quest = { id: nanoid(), title: attributes.title, status: 'active'}; set(state => ({ gameState: { ...state.gameState, quests: [...state.gameState.quests, newQuest] }})); } break;
        case 'quest_update': if(attributes.id && attributes.status) { set(state => ({ gameState: { ...state.gameState, quests: state.gameState.quests.map(q => q.id === attributes.id ? {...q, status: attributes.status as Quest['status']} : q)}})); } break;
        case 'quest_remove': if(attributes.id) { set(state => ({ gameState: { ...state.gameState, quests: state.gameState.quests.filter(q => q.id !== attributes.id) }}));} break;
        case 'timeline_event': set(state => ({ gameState: { ...state.gameState, timeline: [...state.gameState.timeline, { id: nanoid(), description: currentContent, timestamp: new Date().toISOString() }] }})); break;
        case 'kb_entry': 
            if (attributes.name && attributes.type && attributes.fields) {
                try {
                    const fields = JSON.parse(attributes.fields.replace(/'/g, '"'));
                    const id = nanoid();
                    const newEntry: KnowledgeBaseEntry = { id, name: attributes.name, type: attributes.type as KnowledgeBaseEntry['type'], fields };
                    set(state => ({ world: { ...state.world, knowledgeBase: {...state.world.knowledgeBase, [id]: newEntry }}}));
                    if (newEntry.type === 'location') {
                        set(state => ({ world: { ...state.world, lore: `${state.world.lore}\n[Location: ${newEntry.name}]` }}));
                    }
                } catch (e) { console.error("Failed to parse kb_entry fields JSON:", attributes.fields); }
            }
            break;
        case 'gen_npc_image':
            if (attributes.id && attributes.prompt) {
                const { id: npcId, prompt: npcPrompt } = attributes;
                const promise = (async () => {
                    try {
                        const b64Image = await generateImage(npcPrompt);
                        const imageUrl = `data:image/jpeg;base64,${b64Image}`;
                        set(state => ({ world: { ...state.world, npcs: state.world.npcs.map(npc => npc.id === npcId ? { ...npc, imageUrl, imageUrlHistory: [...(npc.imageUrlHistory || []), { url: imageUrl, prompt: npcPrompt }] } : npc ) }}));
                    } catch (e) { console.error(`Failed to generate image for NPC ${npcId}:`, e); get().addToast(`Image generation failed for NPC.`, 'error'); }
                })();
                imagePromises.push(promise);
            }
            break;
        case 'gen_image': case 'gen_char_image':
            const isCharImage = currentTagName === 'gen_char_image';
            const imagePrompt = currentContent;
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
    if(significantChange && get().settings.engine.service === 'cloud'){
        const { character } = get();
        const autoPrompt = `Full body portrait of ${character.name}, a character whose status is ${JSON.stringify(character.status)}. They are carrying: ${character.inventory.join(', ')}.`;
         const promise = (async () => {
            try {
                const b64Image = await generateImage(autoPrompt);
                const imageUrl = `data:image/jpeg;base64,${b64Image}`;
                set(state => ({ character: { ...state.character, imageUrl, imageUrlHistory: [...state.character.imageUrlHistory, { url: imageUrl, prompt: autoPrompt }] }}));
                get().addToast('Character portrait updated due to state change.', 'info');
            } catch (e) { console.error("Auto-portrait generation failed:", e); }
        })();
        imagePromises.push(promise);
    }
    
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

      const newStoryLog = storyLog.slice(0, entryIndex);
      const actionToRegen = storyLog[entryIndex].content;
      
      set(state => ({
          gameState: { ...state.gameState, storyLog: newStoryLog }
      }));
      get().handlePlayerAction(actionToRegen);
  },
  
  generateCharacterPortrait: async () => {
    if (get().gameState.isLoading) return;
    set(state => ({ gameState: { ...state.gameState, isLoading: true }}));
    get().addToast('Generating new character portrait...', 'info');

    try {
        const { character, settings } = get();
        const autoPrompt = `Full body portrait of ${character.name}, a character whose status is ${JSON.stringify(character.status)}. They are carrying: ${character.inventory.join(', ')}.`;
        
        const { service } = settings.engine;
        const b64Image = service === 'cloud' 
            ? await generateImage(autoPrompt) 
            : await generateLocalImage(autoPrompt);

        const imageUrl = `data:image/jpeg;base64,${b64Image}`;
        set(state => ({ 
            character: { 
                ...state.character, 
                imageUrl, 
                imageUrlHistory: [...state.character.imageUrlHistory, { url: imageUrl, prompt: autoPrompt }] 
            }
        }));
        get().addToast('Character portrait updated!', 'success');
    } catch (e) {
        console.error("Manual portrait generation failed:", e);
        get().addToast('Portrait generation failed.', 'error');
    } finally {
        set(state => ({ gameState: { ...state.gameState, isLoading: false }}));
    }
  },

  createSnapshot: (name) => {
      const { character, world, gameState } = get();
      const gameData: GameData = { character, world, gameState: { ...gameState, isLoading: false } };
      const newSnapshot: Snapshot = {
          id: nanoid(),
          name,
          createdAt: new Date().toISOString(),
          data: JSON.parse(JSON.stringify(gameData)) // Deep copy
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
    const { character, world, gameState, snapshots } = get();
    const saveState = { version: '2.0.0', savedAt: new Date().toISOString(), character, world, gameState: { ...gameState, isLoading: false }, snapshots };
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
            set({ character: savedData.character, world: savedData.world, gameState: { ...savedData.gameState, phase: GamePhase.PLAYING }, snapshots: savedData.snapshots || [] });
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
        zip.file('save.json', JSON.stringify({ version: '2.0.0', character, world, gameState, settings }, null, 2));

        const imagePrompts: string[] = [];
        const imageFolder = zip.folder('images');
        let imageCounter = 1;

        const addImageToZip = async (url: string, prompt: string, name: string) => {
            if (!url || !url.startsWith('data:image')) return;
            const b64data = url.split(',')[1];
            const fileName = `${name}_${imageCounter}.jpg`;
            imagePrompts.push(`${fileName}: ${prompt}`);
            imageFolder?.file(fileName, b64data, { base64: true });
            imageCounter++;
        };
        
        for (const img of character.imageUrlHistory) { await addImageToZip(img.url, img.prompt, character.name.replace(/\s+/g, '_')); }
        for (const npc of world.npcs) {
            if (npc.imageUrlHistory) {
                for (const img of npc.imageUrlHistory) {
                    await addImageToZip(img.url, img.prompt, npc.name.replace(/\s+/g, '_'));
                }
            }
        }

        const pdf = new jsPDF();
        pdf.setFont("Helvetica");
        pdf.setFontSize(12);
        let yPos = 15;
        const pageHeight = pdf.internal.pageSize.height - 20;
        
        pdf.text(`${settings.appName} Saga`, 10, yPos);
        yPos += 10;

        for (const entry of gameState.storyLog) {
             const content = entry.content.startsWith('data:image') ? `(See images folder for image with prompt: ${entry.prompt})` : entry.content;
             const textLines = pdf.splitTextToSize(`[${entry.type}] ${content}`, 180);
             if (yPos + (textLines.length * 7) > pageHeight) { pdf.addPage(); yPos = 15; }
             pdf.text(textLines, 10, yPos);
             yPos += textLines.length * 7 + 5;
             if (entry.type === 'image' && entry.content.startsWith('data:image')) { await addImageToZip(entry.content, entry.prompt || 'N/A', 'narrative'); }
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