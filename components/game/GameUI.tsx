
import React from 'react';
import { useStore } from '../../hooks/useStore';
import { CharacterPanel } from './CharacterPanel';
import { NarrativePanel } from './NarrativePanel';
import { ContextPanel } from './ContextPanel';
import { ResizablePanels } from '../layout/ResizablePanels';
import { Button } from '../ui/Button';
import { PanelType } from '../../types';

export const GameUI: React.FC = () => {
  const appName = useStore((state) => state.settings.appName);
  const panelOrder = useStore((state) => state.settings.layout.panelOrder);
  const toggleSettings = useStore((state) => state.toggleSettings);
  const saveGame = useStore((state) => state.saveGame);
  const exportGame = useStore((state) => state.exportGame);

  const panelComponents: Record<PanelType, React.ReactNode> = {
    character: <CharacterPanel />,
    narrative: <NarrativePanel />,
    context: <ContextPanel />,
  };

  const orderedPanels = panelOrder.map(panelType => panelComponents[panelType]);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900">
      <header className="flex-shrink-0 h-14 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 flex items-center justify-between px-4 z-10">
        <h1 className="text-xl font-bold text-sky-400">{appName}</h1>
        <div className="flex items-center space-x-2">
            <Button variant="secondary" onClick={saveGame}>Save</Button>
            <Button variant="secondary" onClick={exportGame}>Export Saga</Button>
            <Button onClick={toggleSettings}>Settings</Button>
        </div>
      </header>
      <main className="flex-grow overflow-hidden">
        <ResizablePanels>
            {orderedPanels}
        </ResizablePanels>
      </main>
    </div>
  );
};
