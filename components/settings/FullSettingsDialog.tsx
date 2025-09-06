import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { Dialog } from '../ui/Dialog';
import { Tabs } from '../ui/Tabs';
import { Button } from '../ui/Button';
import { PanelOrderManager } from './PanelOrderManager';
import { GenerationService, Theme, Persona, ImageGenerationContext, Settings } from '../../types';
import { toBase64 } from '../../lib/utils';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Tooltip } from '../ui/Tooltip';
import { ModelSandbox } from './Sandbox';

const PersonaManager: React.FC = () => {
    const { personas, activePersonaId, addPersona, updatePersona, deletePersona, setActivePersona } = useStore(state => ({
        personas: state.settings.engine.cloud.personas,
        activePersonaId: state.settings.engine.cloud.activePersonaId,
        addPersona: state.addPersona,
        updatePersona: state.updatePersona,
        deletePersona: state.deletePersona,
        setActivePersona: state.setActivePersona,
    }));
    const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

    const handleSave = () => {
        if (editingPersona) {
            if (personas.some(p => p.id === editingPersona.id)) {
                updatePersona(editingPersona);
            } else {
                addPersona({ name: editingPersona.name, prompt: editingPersona.prompt });
            }
            setEditingPersona(null);
        }
    };
    
    return (
        <div className="space-y-4">
            {editingPersona ? (
                 <div>
                    <h4 className="font-semibold mb-2">{editingPersona.id ? 'Edit' : 'New'} Persona</h4>
                    <Input label="Name" value={editingPersona.name} onChange={e => setEditingPersona({...editingPersona, name: e.target.value })} />
                    <Textarea label="System Prompt" value={editingPersona.prompt} onChange={e => setEditingPersona({...editingPersona, prompt: e.target.value })} rows={10} className="mt-2" />
                    <div className="flex space-x-2 mt-2">
                        <Button onClick={handleSave}>Save</Button>
                        <Button variant="secondary" onClick={() => setEditingPersona(null)}>Cancel</Button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-center">
                        <h4 className="font-semibold">Director Personas</h4>
                        <Button size="sm" onClick={() => setEditingPersona({ id: '', name: 'New Persona', prompt: 'You are...' })}>Add New</Button>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {personas.map(p => (
                            <div key={p.id} className={`p-3 rounded-md flex justify-between items-center ${p.id === activePersonaId ? 'bg-sky-900/50 border border-sky-500' : 'bg-gray-700'}`}>
                                <div>
                                    <p className="font-semibold">{p.name}</p>
                                    <p className="text-xs text-gray-400 truncate max-w-sm">{p.prompt}</p>
                                </div>
                                <div className="space-x-2 flex-shrink-0">
                                    {p.id !== activePersonaId && <Button size="sm" onClick={() => setActivePersona(p.id)}>Activate</Button>}
                                    <Button size="sm" variant="secondary" onClick={() => setEditingPersona(p)}>Edit</Button>
                                    {personas.length > 1 && <Button size="sm" variant="danger" onClick={() => deletePersona(p.id)}>Delete</Button>}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

const EngineSettings: React.FC = () => {
    const settings = useStore(state => state.settings);
    const setSettings = useStore(state => state.setSettings);
    const [modelUrl, setModelUrl] = useState('');
    const [downloadProgress, setDownloadProgress] = useState(0);

    const availableImageModels = [
        'imagen-4.0-generate-001',
        'segmind/tiny-sd',
        'stabilityai/stable-diffusion-2-1-base',
        'SimianLuo/LCM_Dreamshaper_v7'
    ];

    const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSettings((current) => ({ ...current, engine: { ...current.engine, service: e.target.value as GenerationService }}));
    };
    
    // Mock download
    const handleDownloadModel = () => {
        const interval = setInterval(() => {
            setDownloadProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    useStore.getState().addToast(`Model "${modelUrl}" ready!`, 'success');
                    return 100;
                }
                return prev + 10;
            });
        }, 200);
    }
    
    const handleAssignmentChange = (context: ImageGenerationContext, model: string) => {
        setSettings(current => ({
            ...current,
            engine: {
                ...current.engine,
                imageModelAssignments: {
                    ...current.engine.imageModelAssignments,
                    [context]: model,
                },
            },
        }));
    };

    return (
        <div className="space-y-6 text-gray-300">
            <div>
                <label className="block text-sm font-medium">Generation Service</label>
                <select value={settings.engine.service} onChange={handleServiceChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 bg-gray-700 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md text-white">
                    <option value={GenerationService.CLOUD}>Cloud (Gemini API)</option>
                    <option value={GenerationService.LOCAL}>Local (In-Browser)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                    {settings.engine.service === 'cloud' ? 'Uses powerful Google Gemini models. Requires API key.' : 'Runs smaller models directly in your browser. Slower, lower quality, but fully private.'}
                </p>
            </div>
            
             <div className="p-4 border border-gray-600 rounded-md">
                <h4 className="font-semibold mb-2">Image Model Assignments</h4>
                <p className="text-sm text-gray-400 mb-3">Assign a specific model for different creative contexts.</p>
                <div className="grid grid-cols-2 gap-4">
                    {(Object.keys(settings.engine.imageModelAssignments) as ImageGenerationContext[]).map(context => (
                         <div key={context}>
                            <label className="block text-sm font-medium capitalize">{context}</label>
                            <select 
                                value={settings.engine.imageModelAssignments[context]}
                                onChange={(e) => handleAssignmentChange(context, e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 bg-gray-700 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md text-white"
                            >
                                {availableImageModels.map(model => <option key={model} value={model}>{model}</option>)}
                            </select>
                         </div>
                    ))}
                </div>
            </div>

            {settings.engine.service === 'local' && (
                <div className="p-4 border border-gray-600 rounded-md">
                    <h4 className="font-semibold mb-2">Local Model Hub</h4>
                    <p className="text-sm text-gray-400 mb-3">Download models from Hugging Face to use locally. In a native app, these would save to `/models/`.</p>
                    <div className="flex space-x-2">
                        <Input value={modelUrl} onChange={e => setModelUrl(e.target.value)} placeholder="e.g., Xenova/phi-3-mini-4k-instruct"/>
                        <Button onClick={handleDownloadModel}>Download</Button>
                    </div>
                    {downloadProgress > 0 && downloadProgress < 100 && (
                        <div className="w-full bg-gray-600 rounded-full h-2.5 mt-2">
                            <div className="bg-sky-500 h-2.5 rounded-full" style={{width: `${downloadProgress}%`}}></div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const GameplaySettings: React.FC = () => {
    const { costs, setSettings, settings } = useStore(state => ({
        costs: state.settings.gameplay.costs,
        setSettings: state.setSettings,
        settings: state.settings
    }));

    const handleCostChange = (key: keyof typeof costs, value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            setSettings(current => ({ ...current, gameplay: { ...current.gameplay, costs: { ...costs, [key]: numValue } } }));
        }
    };
    
    return (
        <div className="space-y-4">
            <h4 className="font-semibold">Action Costs</h4>
            <p className="text-sm text-gray-400">Set the credit cost for various AI actions.</p>
            <div className="grid grid-cols-2 gap-4">
                <Input label="Text Generation Cost" type="number" value={costs.textGeneration} onChange={e => handleCostChange('textGeneration', e.target.value)} />
                <Input label="Image Generation Cost" type="number" value={costs.imageGeneration} onChange={e => handleCostChange('imageGeneration', e.target.value)} />
                <Input label="Image Edit Cost" type="number" value={costs.imageEdit} onChange={e => handleCostChange('imageEdit', e.target.value)} />
                <Input label="Suggestion Cost" type="number" value={costs.suggestion} onChange={e => handleCostChange('suggestion', e.target.value)} />
            </div>
        </div>
    );
};

const PerformanceSettings: React.FC = () => {
     const { resourceLimit, setSettings, settings } = useStore(state => ({
        resourceLimit: state.settings.performance.resourceLimit,
        setSettings: state.setSettings,
        settings: state.settings
    }));

    const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings(current => ({ ...current, performance: { ...current.performance, resourceLimit: parseInt(e.target.value, 10) }}));
    }

    return (
        <div className="space-y-4">
            <div>
                <label htmlFor="resourceLimit" className="block text-sm font-medium text-gray-300">System Resource Limit: {resourceLimit}%</label>
                <input type="range" id="resourceLimit" min="25" max="100" step="5" value={resourceLimit} onChange={handleLimitChange} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"/>
                <p className="text-xs text-gray-400 mt-1">
                    (Note: In a web environment, this is a mock setting. In a native app, this would control CPU/RAM allocation for local models.)
                </p>
            </div>
        </div>
    )
}

const StyleSettings: React.FC = () => {
    // FIX: Access the full settings object to find the active theme, instead of a non-existent `theme` property.
    const { settings, setSettings } = useStore(state => ({
        settings: state.settings,
        setSettings: state.setSettings,
    }));
    const theme = settings.themes.find(t => t.name === settings.activeThemeName) || settings.themes[0];
    
    const fonts = ["Inter, sans-serif", "Orbitron, sans-serif", "Roboto, sans-serif", "Lora, serif", "Source Code Pro, monospace"];

    // FIX: Correctly update the active theme within the `themes` array in the settings state.
    const handleThemeUpdate = (updatedTheme: Theme) => {
        if (!theme) return;
        const newThemes = settings.themes.map(t => t.name === updatedTheme.name ? updatedTheme : t);
        setSettings({ themes: newThemes });
    };

    const handleThemeChange = <K extends keyof Omit<Theme, 'name' | 'isCustom'>>(key: K, value: Theme[K]) => {
        if (!theme) return;
        handleThemeUpdate({ ...theme, [key]: value });
    };

    const handleFontChange = (type: 'body' | 'heading', value: string) => {
        if (!theme) return;
        handleThemeUpdate({ ...theme, fonts: { ...theme.fonts, [type]: value } });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const base64 = await toBase64(file);
            handleThemeChange('backgroundImage', base64 as string);
        }
    };

    if (!theme) return null; // Guard clause if no theme is found

    return (
        <div className="space-y-6">
             <div>
                <label className="block text-sm font-medium text-gray-300">Body Font</label>
                <select value={theme.fonts.body} onChange={e => handleFontChange('body', e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 bg-gray-700 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md text-white">
                    {fonts.map(f => <option key={f} value={f} style={{fontFamily: f}}>{f.split(',')[0]}</option>)}
                </select>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-300">Heading Font</label>
                <select value={theme.fonts.heading} onChange={e => handleFontChange('heading', e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 bg-gray-700 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md text-white">
                    {fonts.map(f => <option key={f} value={f} style={{fontFamily: f}}>{f.split(',')[0]}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="fontSize" className="block text-sm font-medium text-gray-300">Base Font Size: {theme.baseFontSize}px</label>
                <input type="range" id="fontSize" min="12" max="20" step="1" value={theme.baseFontSize} onChange={e => handleThemeChange('baseFontSize', parseInt(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"/>
             </div>
             <div>
                 <label className="block text-sm font-medium text-gray-300">Custom Background Image</label>
                 <Input type="file" accept="image/*" onChange={handleImageUpload} className="mt-1"/>
             </div>
        </div>
    );
};

const LayoutSettings: React.FC = () => {
    const visibility = useStore(state => state.settings.componentVisibility);
    const setSettings = useStore(state => state.setSettings);
    
    // FIX: This function was attempting to spread a boolean for the `resourceMonitor` setting,
    // causing a crash. It now checks if the target property is an object before spreading.
    const handleVisibilityChange = (section: keyof typeof visibility, key: string, value: boolean) => {
        setSettings(current => {
            const sectionData = current.componentVisibility[section];

            if (typeof sectionData !== 'object' || sectionData === null) {
                return {}; // Return empty partial for no change
            }

            return {
                componentVisibility: {
                    ...current.componentVisibility,
                    [section]: {
                        ...sectionData,
                        [key]: value,
                    }
                }
            };
        });
    };
    
    const handleTopLevelVisibilityChange = (key: keyof typeof visibility, value: boolean) => {
         setSettings(current => ({
            ...current,
            componentVisibility: {
                ...current.componentVisibility,
                [key]: value,
            }
         }));
    };

    return (
        <div className="space-y-6">
            <PanelOrderManager />
             <div>
                <h4 className="text-md font-semibold text-gray-200 mb-2">UI Components</h4>
                <div className="space-y-2">
                     <label className="flex items-center space-x-3">
                        <input type="checkbox" checked={visibility.resourceMonitor} onChange={e => handleTopLevelVisibilityChange('resourceMonitor', e.target.checked)} className="rounded bg-gray-700 border-gray-600 text-sky-500 focus:ring-sky-600"/>
                        <span className="text-sm text-gray-300">Show Resource Monitor</span>
                    </label>
                </div>
            </div>
        </div>
    );
};

const DangerZone: React.FC<{onClose: ()=>void}> = ({onClose}) => {
    const restartGame = useStore(state => state.restartGame);

    const handleRestart = () => {
        if(window.confirm("Are you sure you want to restart the game? All unsaved progress will be lost.")) {
            restartGame();
            onClose();
        }
    }

    return (
        <div className="border-t border-red-500/30 pt-4 mt-6">
            <h3 className="text-lg font-bold text-red-500">Danger Zone</h3>
            <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-400">Permanently delete all game data and return to the onboarding screen.</p>
                <Button variant="danger" onClick={handleRestart}>Restart Game</Button>
            </div>
        </div>
    );
}

interface FullSettingsDialogProps {
  onClose: () => void;
}

export const FullSettingsDialog: React.FC<FullSettingsDialogProps> = ({ onClose }) => {
  const isSettingsOpen = useStore((state) => state.isSettingsOpen);

  const tabs = [
    { label: 'Engine', content: <EngineSettings /> },
    { label: 'Personas', content: <PersonaManager /> },
    { label: 'Sandbox', content: <ModelSandbox /> },
    { label: 'Gameplay', content: <GameplaySettings /> },
    { label: 'Performance', content: <PerformanceSettings /> },
    { label: 'Layout', content: <LayoutSettings /> },
    { label: 'Style', content: <StyleSettings /> },
    { label: 'Data', content: <DangerZone onClose={onClose} /> },
  ];

  return (
    <Dialog isOpen={isSettingsOpen} onClose={onClose} title="Application Settings">
      <Tabs tabs={tabs} />
    </Dialog>
  );
};
