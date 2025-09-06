import type { StateCreator } from 'zustand';
import { temporal } from 'zundo';
import { AppState, GamePhase, NPC, PanelType, Settings, StoryLogEntry, GameData, Toast, Quest, KnowledgeBaseEntry, Snapshot, Persona, ExportFormat, GenerationService, Location, MapPath, ImageGenerationContext } from '../types';
import { INITIAL_STATE, INITIAL_GAME_DATA } from '../constants';
import { generateTextStream, generateImage, generateEnhancedPrompt, suggestActionFromContext, editImageWithMask, generateOnboardingFromImage, checkApiKey, setUserApiKey } from '../services/geminiService';
import { generateLocalText, generateLocalImage } from '../services/localGenerationService';
import { generateLocalApiText } from '../services/localApiGenerationService';
import { nanoid } from 'nanoid';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import * as FileSaver from 'file-saver';
import { toBase64 } from '../lib/utils';

const historySlice: StateCreator<AppState, [], [], AppState> = (set, get) => ({
  ...INITIAL_STATE,

  // API Key Actions
  validateApiKey: async (key?: string) => {
    const currentKey = get().apiKey;
    const keyToValidate = key || currentKey;

    if (get().settings.engine.service !== GenerationService.CLOUD) {
        set({ apiKeyStatus: 'valid' });
        return;
    }

    if (!keyToValidate) {
        set({ apiKeyStatus: 'invalid' });
        return;
    }
    
    set({ apiKeyStatus: 'validating' });
    const isValid = await checkApiKey();
    set({ apiKeyStatus: isValid ? 'valid' : 'invalid' });
    if (isValid && key) {
        get().addToast("API Key validated successfully!", "success");
    }
  },

  switchToLocalMode: () => {
    get().setSettings(current => ({ 
        ...current,
        engine: { ...current.engine, service: GenerationService.LOCAL } 
    }));
    set({ apiKeyStatus: 'valid' }); // Mark as valid to proceed into the app
    get().addToast("Switched to Local AI Mode.", "info");
  },

  setUserApiKey: (key: string) => {
    setUserApiKey(key);
    set({ apiKey: key });
    get().validateApiKey(key);
  },

  // UI Actions (not part of history)
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
  toggleDiceRoller: () => set(state => ({ isDiceRollerOpen: !state.isDiceRollerOpen })),
  toggleAudioPlayer: () => set(state => ({ isAudioPlayerOpen: !state.isAudioPlayerOpen })),
  toggleCommandPalette: () => set(state => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  toggleExportModal: () => set(state => ({ isExportModalOpen: !state.isExportModalOpen })),
  toggleImageEditor: (logEntryId) => set(state => ({ isImageEditorOpen: { open: !state.isImageEditorOpen.open, logEntryId: logEntryId || null }})),
  setAudioUrl: (url: string) => set({ audioUrl: url }),

  setPanelOrder: (order: PanelType[]) => set((state) => ({ settings: { ...state.settings, layout: { ...state.settings.layout, panelOrder: order } } })),
  setPanelSizes: (sizes: number[]) => set((state) => ({ settings: { ...state.settings, layout: { ...state.settings.layout, panelSizes: sizes } } })),
  setSettings: (updater) => {
    set(state => ({
        settings: typeof updater === 'function' ? { ...state.settings, ...updater(state.settings) } : { ...state.settings, ...updater }
    }))
  },

  addToast: (message, type = 'info') => {
      const newToast: Toast = { id: nanoid(), message, type };
      set(state => ({ toasts: [...state.toasts, newToast] }));
      setTimeout(() => get().removeToast(newToast.id), 5000);
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),

  restartGame: () => {
    const settings = get().settings;
    set({ ...INITIAL_STATE, settings }); // Keep settings
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
      character: { ...INITIAL_GAME_DATA.character, name: charName, backstory: charBackstory, imageUrl: initialImageUrl, imageUrlHistory: initialHistory },
      world: { ...INITIAL_GAME_DATA.world, lore: worldConcept },
      gameState: { ...INITIAL_GAME_DATA.gameState, phase: GamePhase.PLAYING, storyLog: [{ id: nanoid(), type: 'system', content: `The story begins. World: ${worldConcept}. Character: ${charName}.`, timestamp: new Date().toISOString() }] },
    });

    if (!charImageBase64) { await get().generateCharacterPortrait(); }
    get().handlePlayerAction(openingPrompt);
  },
  
  handlePlayerAction: async (action: string) => {
    const state = get();
    if (state.gameState.isLoading) return;
    
    const cost = state.settings.gameplay.costs.textGeneration;
    if (state.settings.creditSystem.enabled && state.credits.current < cost) {
        state.addToast(`Not enough credits. Need ${cost}, have ${state.credits.current}.`, 'error');
        return;
    }

    let finalAction = action;
    const { settings } = state;

    if (settings.gameplay.promptAssist && settings.engine.service === 'cloud') {
        try {
            finalAction = await generateEnhancedPrompt(action, settings.engine.cloud.textModel);
            state.addToast(`Used enhanced prompt: "${finalAction}"`, 'info');
        } catch (e) {
            console.error("Prompt assist failed:", e);
            state.addToast("Prompt assist failed. Using original prompt.", 'error');
        }
    }

    set({ gameState: { ...state.gameState, isLoading: true, storyLog: [...state.gameState.storyLog, { id: nanoid(), type: 'player', content: action, timestamp: new Date().toISOString() }] } });

    const { character, world, gameState } = get();
    const fullPrompt = `GAME STATE:\nCharacter: ${JSON.stringify(character)}\nWorld: ${JSON.stringify(world)}\nTimeline: ${JSON.stringify(gameState.timeline)}\nQuests: ${JSON.stringify(gameState.quests)}\nLatest Events: ${gameState.storyLog.slice(-5).map(e => `${e.type}: ${e.content}`).join('\n')}\n\nPLAYER ACTION: "${finalAction}"`;

    try {
        let cleanNarrative = "";
        if (settings.engine.service === GenerationService.CLOUD) {
            const modelName = settings.engine.cloud.textModel;
            const activePersona = settings.engine.cloud.personas.find(p => p.id === settings.engine.cloud.activePersonaId);
            const systemInstruction = activePersona ? activePersona.prompt : "You are a helpful AI assistant.";
            const stream = await generateTextStream(fullPrompt, modelName, systemInstruction);
            const narrativeEntryId = nanoid();
            
            set(s => ({ gameState: { ...s.gameState, storyLog: [...s.gameState.storyLog, { id: narrativeEntryId, type: 'narrative', content: '', timestamp: new Date().toISOString() }] }}));
            
            let fullResponse = "", accumulatedChunk = "", lastUpdateTime = 0;
            const updateInterval = 150;

            const updateState = () => {
                if (accumulatedChunk.length > 0) {
                    fullResponse += accumulatedChunk;
                    set(s => ({ gameState: { ...s.gameState, storyLog: s.gameState.storyLog.map(e => e.id === narrativeEntryId ? { ...e, content: fullResponse } : e) }}));
                    accumulatedChunk = "";
                    lastUpdateTime = Date.now();
                }
            };

            for await (const chunk of stream) {
                accumulatedChunk += chunk;
                if (Date.now() - lastUpdateTime > updateInterval) { updateState(); }
            }
            updateState();
            cleanNarrative = await get().parseAndApplyTags(fullResponse);
            set(s => ({ gameState: { ...s.gameState, storyLog: s.gameState.storyLog.map(e => e.id === narrativeEntryId ? { ...e, content: cleanNarrative } : e) }}));

        } else if (settings.engine.service === GenerationService.LOCAL_API) {
            const rawResponse = await generateLocalApiText(fullPrompt, settings.engine.localApi.baseUrl, settings.engine.localApi.apiKey);
            cleanNarrative = await get().parseAndApplyTags(rawResponse);
        } else {
            const rawResponse = await generateLocalText(fullPrompt);
            cleanNarrative = await get().parseAndApplyTags(rawResponse);
        }

        if (settings.engine.service !== GenerationService.CLOUD && cleanNarrative) {
          set(s => ({ gameState: { ...s.gameState, storyLog: [...s.gameState.storyLog, { id: nanoid(), type: 'narrative', content: cleanNarrative, timestamp: new Date().toISOString() }] }}));
        }
        
        if (settings.creditSystem.enabled) {
            set(s => ({ credits: { ...s.credits, current: s.credits.current - cost } }));
        }

    } catch (error) {
        console.error("Error generating response:", error);
        get().addToast(`Error: Could not get a response from the AI. ${error instanceof Error ? error.message : ''}`, 'error');
    } finally {
        set(s => ({ gameState: { ...s.gameState, isLoading: false } }));
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
        while ((attrMatch = attrRegex.exec(attrStr)) !== null) { attributes[attrMatch[1]] = attrMatch[2]; }
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
        case 'update_npc_relation': if (attributes.npc1_id && attributes.npc2_id && attributes.value) { set(state => { const rels = { ...state.world.interNpcRelationships }; if (!rels[attributes.npc1_id]) rels[attributes.npc1_id] = {}; rels[attributes.npc1_id][attributes.npc2_id] = (rels[attributes.npc1_id][attributes.npc2_id] || 0) + parseInt(attributes.value); return { world: { ...state.world, interNpcRelationships: rels } }; }); } break;
        case 'quest_add': if(attributes.title) { const newQuest: Quest = { id: nanoid(), title: attributes.title, status: 'active'}; set(state => ({ gameState: { ...state.gameState, quests: [...state.gameState.quests, newQuest] }})); } break;
        case 'quest_update': if(attributes.id && attributes.status) { set(state => ({ gameState: { ...state.gameState, quests: state.gameState.quests.map(q => q.id === attributes.id ? {...q, status: attributes.status as Quest['status']} : q)}})); } break;
        case 'quest_remove': if(attributes.id) { set(state => ({ gameState: { ...state.gameState, quests: state.gameState.quests.filter(q => q.id !== attributes.id) }}));} break;
        case 'timeline_event': set(state => ({ gameState: { ...state.gameState, timeline: [...state.gameState.timeline, { id: nanoid(), description: currentContent, timestamp: new Date().toISOString() }] }})); break;
        case 'kb_entry': if (attributes.name && attributes.type && attributes.fields) { try { const fields = JSON.parse(attributes.fields.replace(/'/g, '"')); const id = nanoid(); const newEntry: KnowledgeBaseEntry = { id, name: attributes.name, type: attributes.type as KnowledgeBaseEntry['type'], fields }; set(state => ({ world: { ...state.world, knowledgeBase: {...state.world.knowledgeBase, [id]: newEntry }}})); if (newEntry.type === 'location') { set(state => ({ world: { ...state.world, lore: `${state.world.lore}\n[Location: ${newEntry.name}]` }})); } } catch (e) { console.error("Failed to parse kb_entry fields JSON:", attributes.fields); } } break;
        case 'map_update': if (attributes.location_name && attributes.new_status) { set(state => { const newLocations = { ...state.world.locations }; if(newLocations[attributes.location_name]) newLocations[attributes.location_name].status = attributes.new_status as Location['status']; return { world: { ...state.world, locations: newLocations }}; }); } break;
        case 'map_add_path': if (attributes.start && attributes.end && attributes.style) { const newPath: MapPath = { start: attributes.start, end: attributes.end, style: attributes.style as MapPath['style'] }; set(state => ({ world: { ...state.world, mapPaths: [...state.world.mapPaths, newPath] }})); } break;
        case 'gen_npc_image':
        case 'gen_creature_image':
        case 'gen_image':
        case 'gen_char_image': {
            const isCharImage = currentTagName === 'gen_char_image';
            let context: ImageGenerationContext = 'scene';
            if (isCharImage) context = 'character';
            if (currentTagName === 'gen_npc_image') context = 'npc';
            if (currentTagName === 'gen_creature_image') context = 'creature';

            const imagePrompt = currentTagName === 'gen_npc_image' ? attributes.prompt || currentContent : currentContent;
            const npcId = currentTagName === 'gen_npc_image' ? attributes.id : null;
            
            if (!imagePrompt) break;

            const placeholderId = nanoid();
            if (!isCharImage) { 
              const placeholderEntry: StoryLogEntry = { id: placeholderId, type: 'image', content: 'generating...', prompt: imagePrompt, timestamp: new Date().toISOString() };
              set(state => ({ gameState: { ...state.gameState, storyLog: [...state.gameState.storyLog, placeholderEntry] }})); 
            }

            const promise = (async () => {
                const cost = get().settings.gameplay.costs.imageGeneration;
                if (get().settings.creditSystem.enabled && get().credits.current < cost) {
                    const errorContent = 'Image generation failed: Not enough credits.';
                    if (!isCharImage) { set(state => ({ gameState: { ...state.gameState, storyLog: state.gameState.storyLog.map(e => e.id === placeholderId ? { ...e, content: errorContent } : e) }})); }
                    return;
                }

                try {
                    const { settings } = get();
                    const imageModel = settings.engine.imageModelAssignments[context];
                    const isLocal = settings.engine.service === GenerationService.LOCAL;
                    
                    const b64Image = isLocal 
                        ? await generateLocalImage(imagePrompt, imageModel) 
                        : await generateImage(imagePrompt, imageModel);

                    const imageUrl = `data:image/jpeg;base64,${b64Image}`;
                    
                    if (isCharImage) { set(state => ({ character: { ...state.character, imageUrl, imageUrlHistory: [...state.character.imageUrlHistory, { url: imageUrl, prompt: imagePrompt }] }})); 
                    } else if (npcId) { set(state => ({ world: { ...state.world, npcs: state.world.npcs.map(npc => npc.id === npcId ? { ...npc, imageUrl, imageUrlHistory: [...(npc.imageUrlHistory || []), { url: imageUrl, prompt: imagePrompt }] } : npc ) }}));
                        set(state => ({ gameState: { ...state.gameState, storyLog: state.gameState.storyLog.map(e => e.id === placeholderId ? { ...e, content: imageUrl } : e) }}));
                    } else { set(state => ({ gameState: { ...state.gameState, storyLog: state.gameState.storyLog.map(e => e.id === placeholderId ? { ...e, content: imageUrl } : e) }})); }
                    
                    if (get().settings.creditSystem.enabled) {
                        set(state => ({ credits: { ...state.credits, current: state.credits.current - cost } }));
                    }
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
    }
    await Promise.all(imagePromises);
    if(significantChange && get().settings.engine.service === 'cloud'){
        await get().generateCharacterPortrait();
    }
    
    return narrativeText;
  },

  updateLogEntry: (id, newContent) => {
    set(state => ({ gameState: { ...state.gameState, storyLog: state.gameState.storyLog.map(entry => entry.id === id ? { ...entry, content: newContent } : entry) }}));
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
      set(state => ({ gameState: { ...state.gameState, storyLog: newStoryLog } }));
      get().handlePlayerAction(actionToRegen);
  },
  
  generateCharacterPortrait: async () => {
    const state = get();
    if (state.gameState.isLoading) return;
    const cost = state.settings.gameplay.costs.imageGeneration;
    if (state.settings.creditSystem.enabled && state.credits.current < cost) {
        state.addToast(`Not enough credits for portrait. Need ${cost}.`, 'error');
        return;
    }

    set(s => ({ gameState: { ...s.gameState, isLoading: true }}));
    state.addToast('Generating new character portrait...', 'info');

    try {
        const { character, settings } = get();
        const autoPrompt = `Full body portrait of ${character.name}, a character whose status is ${JSON.stringify(character.status)}. They are carrying: ${character.inventory.join(', ')}.`;
        
        const imageModel = settings.engine.imageModelAssignments['character'];
        const isLocal = settings.engine.service === GenerationService.LOCAL;
        
        const b64Image = isLocal
            ? await generateLocalImage(autoPrompt, imageModel) 
            : await generateImage(autoPrompt, imageModel);

        const imageUrl = `data:image/jpeg;base64,${b64Image}`;
        set(s => ({ 
            character: { ...s.character, imageUrl, imageUrlHistory: [...s.character.imageUrlHistory, { url: imageUrl, prompt: autoPrompt }] },
            credits: settings.creditSystem.enabled ? { ...s.credits, current: s.credits.current - cost } : s.credits,
        }));
        get().addToast('Character portrait updated!', 'success');
    } catch (e) {
        console.error("Manual portrait generation failed:", e);
        get().addToast('Portrait generation failed.', 'error');
    } finally {
        set(s => ({ gameState: { ...s.gameState, isLoading: false }}));
    }
  },

  suggestPlayerAction: async () => {
    const state = get();
    const cost = state.settings.gameplay.costs.suggestion;
    if (state.settings.creditSystem.enabled && state.credits.current < cost) {
        state.addToast(`Not enough credits for suggestion. Need ${cost}.`, 'error');
        return [];
    }
    set(s => ({ gameState: { ...s.gameState, isLoading: true }}));
    try {
        const { character, gameState, settings } = get();
        const context = `Character: ${JSON.stringify(character)}\n\nRecent Events:\n${gameState.storyLog.slice(-5).map(e => e.content).join('\n---\n')}`;
        const suggestions = await suggestActionFromContext(context, settings.engine.cloud.textModel, settings.characterVoiceSample);
        if (settings.creditSystem.enabled) {
            set(s => ({ credits: { ...s.credits, current: s.credits.current - cost } }));
        }
        return suggestions;
    } catch (e) {
        console.error("Failed to get suggestions:", e);
        get().addToast('Failed to get suggestions.', 'error');
        return [];
    } finally {
        set(s => ({ gameState: { ...s.gameState, isLoading: false }}));
    }
  },

  editImage: async (logEntryId, prompt, mode, maskDataUrl, imageOverrideBase64) => {
    const state = get();
    const cost = state.settings.gameplay.costs.imageEdit;
    if (state.settings.creditSystem.enabled && state.credits.current < cost) {
        state.addToast(`Not enough credits for image edit. Need ${cost}.`, 'error');
        return;
    }

    const originalEntry = state.gameState.storyLog.find(e => e.id === logEntryId);
    if (!originalEntry || originalEntry.type !== 'image' || !originalEntry.content.startsWith('data:')) {
        state.addToast('Original image not found or invalid.', 'error');
        return;
    }
    set(s => ({ gameState: { ...s.gameState, isLoading: true }}));
    try {
        const imageToSendBase64 = imageOverrideBase64 || originalEntry.content.split(',')[1];
        const maskBase64 = maskDataUrl ? maskDataUrl.split(',')[1] : undefined;
        const { image: newImageBase64 } = await editImageWithMask(prompt, imageToSendBase64, maskBase64);
        
        const newImageUrl = `data:image/jpeg;base64,${newImageBase64}`;
        const newLogEntry: StoryLogEntry = {
            id: nanoid(), type: 'image', content: newImageUrl,
            prompt: `(Edit of: ${originalEntry.prompt}) ${prompt}`,
            timestamp: new Date().toISOString()
        };

        set(s => ({
            gameState: { ...s.gameState, storyLog: [...s.gameState.storyLog, newLogEntry] },
            credits: s.settings.creditSystem.enabled ? { ...s.credits, current: s.credits.current - cost } : s.credits,
        }));
        get().addToast("Image successfully edited!", 'success');

    } catch (e) {
        console.error("Failed to edit image:", e);
        get().addToast("Image editing failed.", "error");
    } finally {
        set(s => ({ gameState: { ...s.gameState, isLoading: false }}));
    }
  },

  addPersona: (personaData) => set(s => ({ settings: { ...s.settings, engine: { ...s.settings.engine, cloud: { ...s.settings.engine.cloud, personas: [...s.settings.engine.cloud.personas, { ...personaData, id: nanoid() }] }}}})),
  updatePersona: (persona) => set(s => ({ settings: { ...s.settings, engine: { ...s.settings.engine, cloud: { ...s.settings.engine.cloud, personas: s.settings.engine.cloud.personas.map(p => p.id === persona.id ? persona : p) }}}})),
  deletePersona: (id) => set(s => { const newP = s.settings.engine.cloud.personas.filter(p => p.id !== id); return { settings: { ...s.settings, engine: { ...s.settings.engine, cloud: { ...s.settings.engine.cloud, personas: newP, activePersonaId: s.settings.engine.cloud.activePersonaId === id ? (newP[0]?.id || null) : s.settings.engine.cloud.activePersonaId }}}};}),
  setActivePersona: (id) => set(s => ({ settings: { ...s.settings, engine: { ...s.settings.engine, cloud: { ...s.settings.engine.cloud, activePersonaId: id }}}})),
  
  addTheme: (theme) => set(s => ({ settings: { ...s.settings, themes: [...s.settings.themes, theme] }})),
  updateTheme: (theme) => set(s => ({ settings: { ...s.settings, themes: s.settings.themes.map(t => t.name === theme.name ? theme : t) }})),
  deleteTheme: (name) => set(s => ({ settings: { ...s.settings, themes: s.settings.themes.filter(t => t.name !== name), activeThemeName: s.settings.activeThemeName === name ? 'Nocturne' : s.settings.activeThemeName }})),
  setActiveTheme: (name) => set(s => ({ settings: { ...s.settings, activeThemeName: name }})),
  
  completeTutorial: () => set(s => ({ settings: { ...s.settings, hasCompletedTutorial: true }})),

  createSnapshot: (name) => {
      const { character, world, gameState } = get();
      const gameData: GameData = { character, world, gameState: { ...gameState, isLoading: false } };
      const newSnapshot: Snapshot = { id: nanoid(), name, createdAt: new Date().toISOString(), data: JSON.parse(JSON.stringify(gameData)) };
      set(state => ({ snapshots: [...state.snapshots, newSnapshot]}));
      get().addToast(`Snapshot "${name}" created!`, "success");
  },
  loadSnapshot: (id) => {
      const snapshot = get().snapshots.find(s => s.id === id);
      if (snapshot) {
          set({ ...snapshot.data });
          (get() as any).temporal.getState().clear();
          get().addToast(`Snapshot "${snapshot.name}" loaded!`, "success");
      } else { get().addToast("Snapshot not found.", "error"); }
  },
  deleteSnapshot: (id) => { set(state => ({ snapshots: state.snapshots.filter(s => s.id !== id) })); get().addToast("Snapshot deleted.", "info"); },

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
                character: savedData.character, world: savedData.world, gameState: { ...savedData.gameState, phase: GamePhase.PLAYING }, 
                snapshots: savedData.snapshots || [], settings: savedData.settings || get().settings, credits: savedData.credits || get().credits,
            });
            get().addToast("Game Loaded Successfully!", "success");
        } else { throw new Error("Invalid save file format."); }
      } catch (e) { console.error("Failed to load game:", e); get().addToast("Failed to load save file.", "error"); }
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
            pdf.setFontSize(16); pdf.setFont("Helvetica", "bold"); pdf.text(title, 20, y); y += 8;
            pdf.setFontSize(12); pdf.setFont("Helvetica", "normal");
            if (typeof content === 'string') { const lines = pdf.splitTextToSize(content, 170); pdf.text(lines, 20, y); y += lines.length * 5 + 5;
            } else if (Array.isArray(content)) { content.forEach(item => { pdf.text(`- ${item}`, 25, y); y += 6; });
            } else if (typeof content === 'object') { Object.entries(content).forEach(([key, value]) => { pdf.text(`${key}: ${value}`, 25, y); y += 6; }); }
            y += 5;
        };
        printSection("Backstory", character.backstory);
        printSection("Status", character.status);
        printSection("Skills", character.skills);
        printSection("Inventory", character.inventory);
        pdf.save(`${character.name.replace(/\s+/g, '_')}_Sheet.pdf`);
        get().addToast("Character Sheet Exported!", "success");
    } catch(e) { console.error("Failed to export character sheet", e); get().addToast("Failed to export character sheet.", "error"); }
  },

  exportGame: async (format: ExportFormat) => {
    set(s => ({ gameState: { ...s.gameState, isLoading: true }}));
    get().toggleExportModal();

    try {
        const { character, world, gameState, settings } = get();
        if (format === 'txt') {
            const txt = gameState.storyLog.map(e => e.type === 'narrative' || e.type === 'player' ? `[${e.type.toUpperCase()}]\n${e.content}` : e.type === 'system' ? `--- ${e.content} ---` : `[IMAGE: ${e.prompt}]`).join('\n\n');
            FileSaver.saveAs(new Blob([txt], { type: 'text/plain;charset=utf-8' }), 'story.txt');
        } else if (format === 'html') {
            const storyHtml = gameState.storyLog.map(e => {
                switch(e.type) {
                    case 'player': return `<p class="player"><strong>You:</strong> <em>${e.content}</em></p>`;
                    case 'narrative': return `<p class="narrative">${e.content.replace(/\n/g, '<br>')}</p>`;
                    case 'image': return `<div class="image-container"><p class="prompt">Prompt: ${e.prompt}</p><img src="${e.content}" alt="${e.prompt}"></div>`;
                    case 'system': return `<p class="system">--- ${e.content} ---</p>`;
                    default: return '';
                }
            }).join('');
            const html = `<!DOCTYPE html><html><head><title>${character.name}'s Saga</title><style>body{font-family:sans-serif;line-height:1.6;max-width:800px;margin:auto;padding:2rem;background:#121212;color:#eee}h1{color:#58a6ff}.player{text-align:right;color:#9ecbff}.narrative{color:#c9d1d9}.system{text-align:center;color:#8b949e}.image-container{margin:2rem 0;text-align:center}img{max-width:100%;border-radius:8px}.prompt{font-size:.8rem;color:#8b949e}</style></head><body><h1>${character.name}'s Saga</h1>${storyHtml}</body></html>`;
            FileSaver.saveAs(new Blob([html], { type: 'text/html;charset=utf-8' }), 'story.html');
        } else { // ZIP
            const zip = new JSZip();
            zip.file('save.json', JSON.stringify({ version: '3.0.0', character, world, gameState, settings }, null, 2));
            const imagePrompts: string[] = [];
            const imageFolder = zip.folder('images');
            let imageCounter = 1;
            const addImageToZip = async (url: string, prompt: string, name: string) => {
                if (!url.startsWith('data:image')) return;
                const b64 = url.split(',')[1];
                const fileName = `${name.replace(/\s+/g, '_')}_${imageCounter++}.jpg`;
                imagePrompts.push(`${fileName}: ${prompt}`);
                imageFolder?.file(fileName, b64, { base64: true });
            };
            for (const img of character.imageUrlHistory) { await addImageToZip(img.url, img.prompt, character.name); }
            for (const npc of world.npcs) { if (npc.imageUrlHistory) { for (const img of npc.imageUrlHistory) { await addImageToZip(img.url, img.prompt, npc.name); } } }
            for (const entry of gameState.storyLog) { if (entry.type === 'image') { await addImageToZip(entry.content, entry.prompt || 'N/A', 'narrative'); } }
            zip.file('prompts.txt', imagePrompts.join('\n'));
            const content = await zip.generateAsync({ type: 'blob' });
            FileSaver.saveAs(content, `chimera-export-${Date.now()}.zip`);
        }
        get().addToast(`Saga exported as ${format.toUpperCase()}!`, "success");
    } catch (e) {
        console.error("Failed to export game:", e);
        get().addToast("An error occurred during export.", "error");
    } finally {
        set(s => ({ gameState: { ...s.gameState, isLoading: false }}));
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
