
import type { StateCreator } from 'zustand';
import { AppState, GamePhase, NPC, PanelType, Settings, StoryLogEntry } from '../types';
import { INITIAL_STATE, DIRECTOR_SYSTEM_PROMPT } from '../constants';
import { generateText, generateImage } from '../services/geminiService';
import { generateLocalText, generateLocalImage } from '../services/localGenerationService';
import { nanoid } from 'nanoid';
// Note: These are external libraries that need to be installed.
// npm install jszip jspdf file-saver nanoid
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import * as FileSaver from 'file-saver';
import { toBase64 } from '../lib/utils';

export const createRootSlice: StateCreator<AppState> = (set, get) => ({
  ...INITIAL_STATE,

  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),

  setPanelOrder: (order: PanelType[]) => set((state) => ({ settings: { ...state.settings, layout: { ...state.settings.layout, panelOrder: order } } })),
  setPanelSizes: (sizes: number[]) => set((state) => ({ settings: { ...state.settings, layout: { ...state.settings.layout, panelSizes: sizes } } })),
  setSettings: (newSettings: Partial<Settings>) => set(state => ({ settings: { ...state.settings, ...newSettings }})),

  restartGame: () => {
    set(INITIAL_STATE);
  },

  startGame: (worldConcept, charName, charBackstory, openingPrompt) => {
    set({
      character: {
        ...INITIAL_STATE.character,
        name: charName,
        backstory: charBackstory,
      },
      world: {
        ...INITIAL_STATE.world,
        lore: worldConcept,
      },
      gameState: {
        ...INITIAL_STATE.gameState,
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
    
    // Construct prompt
    const fullPrompt = `
      GAME STATE:
      Character: ${JSON.stringify(character)}
      World: ${JSON.stringify(world)}
      Timeline: ${JSON.stringify(gameState.timeline)}
      Latest Events: ${gameState.storyLog.slice(-5).map(e => `${e.type}: ${e.content}`).join('\n')}
      
      PLAYER ACTION: "${action}"
    `;

    try {
      let rawResponse: string;
      if (settings.engine.service === 'cloud') {
        rawResponse = await generateText(fullPrompt, DIRECTOR_SYSTEM_PROMPT);
      } else {
        // Local service uses a simpler prompt
        rawResponse = await generateLocalText(fullPrompt);
      }
      await get().parseAndApplyTags(rawResponse);
    } catch (error) {
      console.error("Error generating response:", error);
      set(state => ({
        gameState: {
          ...state.gameState,
          storyLog: [...state.gameState.storyLog, { id: nanoid(), type: 'system', content: `Error: Could not get a response from the AI.`, timestamp: new Date().toISOString() }],
        }
      }));
    } finally {
      set(state => ({ gameState: { ...state.gameState, isLoading: false } }));
    }
  },

  parseAndApplyTags: async (rawResponse: string) => {
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
        // Character updates
        case 'char_name':
          set(state => ({ character: { ...state.character, name: content } }));
          break;
        case 'char_backstory':
          set(state => ({ character: { ...state.character, backstory: content } }));
          break;
        case 'char_skill_add':
          if (attributes.key) set(state => ({ character: { ...state.character, skills: { ...state.character.skills, [attributes.key]: content } } }));
          break;
        case 'char_skill_remove':
          if (attributes.key) set(state => {
              const newSkills = { ...state.character.skills };
              delete newSkills[attributes.key];
              return { character: { ...state.character, skills: newSkills } };
            });
          break;
        case 'char_inventory_add':
          set(state => ({ character: { ...state.character, inventory: [...state.character.inventory, content] } }));
          break;
        case 'char_inventory_remove':
          set(state => ({ character: { ...state.character, inventory: state.character.inventory.filter(item => item !== content) } }));
          break;
        case 'char_status_update':
           if (attributes.key) set(state => ({ character: { ...state.character, status: { ...state.character.status, [attributes.key]: content } } }));
          break;
        
        // World updates
        case 'world_lore':
            set(state => ({ world: { ...state.world, lore: state.world.lore + '\n\n' + content } }));
            break;
        case 'add_npc':
            try {
                const npc = JSON.parse(content) as NPC;
                set(state => ({ world: { ...state.world, npcs: [...state.world.npcs, npc] } }));
            } catch (e) { console.error('Failed to parse NPC JSON:', content); }
            break;
        case 'update_npc':
             if (attributes.id) try {
                const updates = JSON.parse(content);
                set(state => ({ world: { ...state.world, npcs: state.world.npcs.map(npc => npc.id === attributes.id ? { ...npc, ...updates } : npc) } }));
            } catch (e) { console.error('Failed to parse NPC update JSON:', content); }
            break;

        // Image generation
        case 'gen_image':
        case 'gen_char_image':
            const isCharImage = tagName === 'gen_char_image';
            const imagePrompt = content;
            const placeholderId = nanoid();
            
            // Add placeholder to log
            const placeholderEntry: StoryLogEntry = { id: placeholderId, type: 'image', content: 'generating...', prompt: imagePrompt, timestamp: new Date().toISOString() };
            if (!isCharImage) {
                 set(state => ({ gameState: { ...state.gameState, storyLog: [...state.gameState.storyLog, placeholderEntry] }}));
            }
            
            const promise = (async () => {
                try {
                    const { service } = get().settings.engine;
                    const b64Image = service === 'cloud' ? await generateImage(imagePrompt) : await generateLocalImage(imagePrompt);
                    const imageUrl = `data:image/jpeg;base64,${b64Image}`;
                    
                    if (isCharImage) {
                        set(state => ({
                            character: {
                                ...state.character,
                                imageUrl,
                                imageUrlHistory: [...state.character.imageUrlHistory, { url: imageUrl, prompt: imagePrompt }]
                            }
                        }));
                    } else {
                        set(state => ({
                            gameState: {
                                ...state.gameState,
                                storyLog: state.gameState.storyLog.map(e => e.id === placeholderId ? { ...e, content: imageUrl } : e)
                            }
                        }));
                    }
                } catch (e) {
                    console.error("Image generation failed:", e);
                    const errorContent = 'Image generation failed.';
                    if (isCharImage) {
                         set(state => ({
                            gameState: { ...state.gameState, storyLog: [...state.gameState.storyLog, { ...placeholderEntry, content: errorContent }] }
                         }));
                    } else {
                        set(state => ({
                            gameState: {
                                ...state.gameState,
                                storyLog: state.gameState.storyLog.map(e => e.id === placeholderId ? { ...e, content: errorContent } : e)
                            }
                        }));
                    }
                }
            })();
            imagePromises.push(promise);
            break;
        }
    }

    if (narrativeText) {
        set(state => ({
            gameState: {
                ...state.gameState,
                storyLog: [...state.gameState.storyLog, { id: nanoid(), type: 'narrative', content: narrativeText, timestamp: new Date().toISOString() }],
            },
        }));
    }

    await Promise.all(imagePromises);
  },

  saveGame: () => {
    const { character, world, gameState } = get();
    const saveState = {
      version: '1.0.0',
      savedAt: new Date().toISOString(),
      character,
      world,
      gameState: { ...gameState, isLoading: false }, // Never save in loading state
    };
    const blob = new Blob([JSON.stringify(saveState, null, 2)], { type: 'application/json' });
    FileSaver.saveAs(blob, `chimera-save-${Date.now()}.json`);
  },

  loadGame: (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const savedData = JSON.parse(event.target?.result as string);
        // Basic validation
        if (savedData.version && savedData.character && savedData.world && savedData.gameState) {
            // Here you could add migration logic for older save versions
            set({
                character: savedData.character,
                world: savedData.world,
                gameState: { ...savedData.gameState, phase: GamePhase.PLAYING },
            });
        } else {
            throw new Error("Invalid save file format.");
        }
      } catch (e) {
        console.error("Failed to load game:", e);
        alert("Failed to load save file. It may be corrupted or in an invalid format.");
      }
    };
    reader.readAsText(file);
  },

  exportGame: async () => {
    set(state => ({ gameState: { ...state.gameState, isLoading: true }}));
    try {
        const { character, world, gameState, settings } = get();
        const zip = new JSZip();

        // 1. Add save.json
        const saveState = { version: '1.0.0', character, world, gameState, settings };
        zip.file('save.json', JSON.stringify(saveState, null, 2));

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

        // 2. Add character images
        for (const img of character.imageUrlHistory) {
            await addImageToZip(img.url, img.prompt);
        }

        // 3. Add story log images and build story text
        const pdf = new jsPDF();
        pdf.setFont("Helvetica");
        pdf.setFontSize(12);
        let yPos = 15;
        const pageHeight = pdf.internal.pageSize.height - 20;
        
        pdf.text(`${settings.appName} Saga`, 10, yPos);
        yPos += 10;

        for (const entry of gameState.storyLog) {
             const textLines = pdf.splitTextToSize(`[${entry.type}] ${entry.content.startsWith('data:image') ? `(See image_${imageCounter}.jpg)` : entry.content}`, 180);
             if (yPos + (textLines.length * 7) > pageHeight) {
                pdf.addPage();
                yPos = 15;
             }
             pdf.text(textLines, 10, yPos);
             yPos += textLines.length * 7 + 5;

            if (entry.type === 'image' && entry.content.startsWith('data:image')) {
                await addImageToZip(entry.content, entry.prompt || 'N/A');
            }
        }
        
        // 4. Add prompts.txt
        zip.file('prompts.txt', imagePrompts.join('\n'));
        
        // 5. Add story.pdf
        const pdfBlob = pdf.output('blob');
        zip.file('story.pdf', pdfBlob);

        // 6. Trigger download
        const content = await zip.generateAsync({ type: 'blob' });
        FileSaver.saveAs(content, `chimera-export-${Date.now()}.zip`);

    } catch (e) {
        console.error("Failed to export game:", e);
        alert("An error occurred during export.");
    } finally {
        set(state => ({ gameState: { ...state.gameState, isLoading: false }}));
    }
  },

});