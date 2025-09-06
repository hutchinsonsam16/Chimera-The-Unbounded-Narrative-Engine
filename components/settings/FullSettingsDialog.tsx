import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { Dialog } from '../ui/Dialog';
import { Tabs } from '../ui/Tabs';
import { Button } from '../ui/Button';
import { PanelOrderManager } from './PanelOrderManager';
import { GenerationService, Theme } from '../../types';
import { toBase64 } from '../../lib/utils';
import { localModelManager } from '../../services/localGenerationService';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

const EngineSettings: React.FC = () => {
    const settings = useStore(state => state.settings);
    const setSettings = useStore(state => state.setSettings);
    const [modelUrl, setModelUrl] = useState('');
    const [downloadProgress, setDownloadProgress] = useState(0);

    const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSettings({ ...settings, engine: { ...settings.engine, service: e.target.value as GenerationService }});
    };
    
    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setSettings({ ...settings, engine: { ...settings.engine, cloud: { ...settings.engine.cloud, systemPrompt: e.target.value }}});
    }
    
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

            {settings.engine.service === 'cloud' && (
                <div>
                    <label className="block text-sm font-medium">Director System Prompt</label>
                    <Textarea value={settings.engine.cloud.systemPrompt} onChange={handlePromptChange} rows={8} className="text-sm font-mono"/>
                    <p className="text-xs text-gray-400 mt-1">Advanced: Modify the master instructions for the AI Director.</p>
                </div>
            )}
            
            {settings.engine.service === 'local' && (
                <div className="p-4 border border-gray-600 rounded-md">
                    <h4 className="font-semibold mb-2">Local Model Hub</h4>
                    <p className="text-sm text-gray-400 mb-3">Download models from Hugging Face to use locally.</p>
                    <div className="flex space-x-2">
                        <Input value={modelUrl} onChange={e => setModelUrl(e.target.value)} placeholder="Enter Hugging Face model URL..."/>
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

const StyleSettings: React.FC = () => {
    const theme = useStore(state => state.settings.theme);
    const setSettings = useStore(state => state.setSettings);
    const fonts = ["Inter, sans-serif", "Orbitron, sans-serif", "Roboto, sans-serif", "Lora, serif", "Source Code Pro, monospace"];

    const handleThemeChange = <K extends keyof Theme>(key: K, value: Theme[K]) => {
        setSettings({ theme: { ...theme, [key]: value } });
    };
    
    const handleFontChange = (type: 'body' | 'heading', value: string) => {
        setSettings({ theme: { ...theme, fonts: { ...theme.fonts, [type]: value } } });
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const base64 = await toBase64(file);
            handleThemeChange('backgroundImage', base64 as string);
        }
    }

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
    return <PanelOrderManager />;
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

// FIX: Added missing props interface for the component.
interface FullSettingsDialogProps {
  onClose: () => void;
}

export const FullSettingsDialog: React.FC<FullSettingsDialogProps> = ({ onClose }) => {
  const isSettingsOpen = useStore((state) => state.isSettingsOpen);

  const tabs = [
    { label: 'Engine', content: <EngineSettings /> },
    { label: 'Layout', content: <LayoutSettings /> },
    { label: 'Style', content: <StyleSettings /> },
    { label: 'Accessibility', content: <div>Accessibility settings coming soon.</div> },
    { label: 'Data', content: <DangerZone onClose={onClose} /> },
  ];

  return (
    <Dialog isOpen={isSettingsOpen} onClose={onClose} title="Application Settings">
      <Tabs tabs={tabs} />
    </Dialog>
  );
};