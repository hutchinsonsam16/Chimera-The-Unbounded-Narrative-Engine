import React from 'react';
import { useStore } from '../../hooks/useStore';
import { CharacterPanel } from './CharacterPanel';
import { NarrativePanel } from './NarrativePanel';
import { ContextPanel } from './ContextPanel';
import { ResizablePanels } from '../layout/ResizablePanels';
import { Button } from '../ui/Button';
import { PanelType } from '../../types';
import { ResourceMonitor } from './ResourceMonitor';
import { Tooltip } from '../ui/Tooltip';

export const GameUI: React.FC = () => {
  const appName = useStore((state) => state.settings.appName);
  const panelOrder = useStore((state) => state.settings.layout.panelOrder);
  const showResourceMonitor = useStore((state) => state.settings.componentVisibility.resourceMonitor);
  const { toggleSettings, saveGame, exportGame, toggleDiceRoller, toggleAudioPlayer, toggleCommandPalette } = useStore(state => ({
      toggleSettings: state.toggleSettings,
      saveGame: state.saveGame,
      exportGame: state.exportGame,
      toggleDiceRoller: state.toggleDiceRoller,
      toggleAudioPlayer: state.toggleAudioPlayer,
      toggleCommandPalette: state.toggleCommandPalette,
  }));

  const panelComponents: Record<PanelType, React.ReactNode> = {
    character: <CharacterPanel />,
    narrative: <NarrativePanel />,
    context: <ContextPanel />,
  };

  const orderedPanels = panelOrder.map(panelType => panelComponents[panelType]);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900">
      <header className="flex-shrink-0 h-14 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 flex items-center justify-between px-4 z-10">
        <h1 className="text-xl font-bold text-sky-400 font-[var(--font-heading)]">{appName}</h1>
        <div className="flex items-center space-x-2">
            <Tooltip text="Open Command Palette (Ctrl+K)">
              <Button variant="secondary" onClick={toggleCommandPalette}>Commands</Button>
            </Tooltip>
            <Tooltip text="Open Dice Roller">
              <Button variant="secondary" onClick={toggleDiceRoller}>Dice</Button>
            </Tooltip>
            <Tooltip text="Open Ambient Audio Player">
              <Button variant="secondary" onClick={toggleAudioPlayer}>Audio</Button>
            </Tooltip>
            <Tooltip text="Save Game State to a File">
              <Button variant="secondary" onClick={saveGame}>Save</Button>
            </Tooltip>
            <Tooltip text="Export Full Saga to a ZIP file">
              <Button variant="secondary" onClick={exportGame}>Export Saga</Button>
            </Tooltip>
            <Tooltip text="Open Application Settings">
              <Button onClick={toggleSettings}>Settings</Button>
            </Tooltip>
        </div>
      </header>
      <main className="flex-grow overflow-hidden">
        <ResizablePanels>
            {orderedPanels}
        </ResizablePanels>
      </main>
      {showResourceMonitor && (
        <footer className="flex-shrink-0 h-8 bg-gray-900/80 border-t border-gray-700/50 flex items-center justify-end px-4 z-10">
          <ResourceMonitor />
        </footer>
      )}
    </div>
  );
};
