
import React from 'react';
import { useStore } from '../../hooks/useStore';
import { Dialog } from '../ui/Dialog';
import { Tabs } from '../ui/Tabs';
import { Button } from '../ui/Button';
import { PanelOrderManager } from './PanelOrderManager';
import { GenerationService } from '../../types';

interface FullSettingsDialogProps {
  onClose: () => void;
}

const EngineSettings: React.FC = () => {
    const settings = useStore(state => state.settings);
    const setSettings = useStore(state => state.setSettings);

    const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSettings({ engine: { ...settings.engine, service: e.target.value as GenerationService }});
    };
    
    return (
        <div className="space-y-4 text-gray-300">
            <div>
                <label className="block text-sm font-medium">Generation Service</label>
                <select value={settings.engine.service} onChange={handleServiceChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 bg-gray-700 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm rounded-md">
                    <option value={GenerationService.CLOUD}>Cloud (Gemini API)</option>
                    <option value={GenerationService.LOCAL}>Local (In-Browser)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                    {settings.engine.service === 'cloud' ? 'Uses powerful Google Gemini models. Requires API key.' : 'Runs smaller models directly in your browser. Slower, lower quality, but fully private.'}
                </p>
            </div>
            {/* TODO: Add model selection dropdowns and display local model download progress */}
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

export const FullSettingsDialog: React.FC<FullSettingsDialogProps> = ({ onClose }) => {
  const isSettingsOpen = useStore((state) => state.isSettingsOpen);

  const tabs = [
    { label: 'Engine', content: <EngineSettings /> },
    { label: 'Layout', content: <LayoutSettings /> },
    // Placeholders for more settings
    { label: 'Style', content: <div>Style settings coming soon.</div> },
    { label: 'Accessibility', content: <div>Accessibility settings coming soon.</div> },
    { label: 'Data', content: <DangerZone onClose={onClose} /> },
  ];

  return (
    <Dialog isOpen={isSettingsOpen} onClose={onClose} title="Application Settings">
      <Tabs tabs={tabs} />
    </Dialog>
  );
};
