
import React from 'react';
import { useStore } from '../../hooks/useStore';
import { Tabs } from '../ui/Tabs';
import { RelationshipWeb } from './RelationshipWeb';
import { InteractiveMap } from './InteractiveMap';

const LoreTab: React.FC = () => {
    const lore = useStore(state => state.world.lore);
    return <div className="p-2 text-sm text-gray-300 whitespace-pre-wrap">{lore}</div>;
};

const NpcsTab: React.FC = () => {
    const npcs = useStore(state => state.world.npcs);
    return (
        <div className="space-y-4 p-2">
            {npcs.map(npc => (
                <div key={npc.id} className="p-3 bg-gray-800 rounded">
                    <h4 className="font-bold text-sky-400">{npc.name}</h4>
                    <p className="text-xs text-gray-400">Relationship: {npc.relationship}</p>
                    <p className="text-sm mt-1 text-gray-300">{npc.description}</p>
                </div>
            ))}
        </div>
    );
};


export const ContextPanel: React.FC = () => {
  const visibility = useStore((state) => state.settings.componentVisibility.context);
  
  const tabs = [];
  if (visibility.lore) tabs.push({ label: 'Lore', content: <LoreTab /> });
  if (visibility.npcs) tabs.push({ label: 'NPCs', content: <NpcsTab /> });
  if (visibility.relationshipWeb) tabs.push({ label: 'Relationship Web', content: <RelationshipWeb /> });
  if (visibility.map) tabs.push({ label: 'Interactive Map', content: <InteractiveMap /> });

  return (
    <div className="bg-gray-800/50 h-full flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-2xl font-bold text-sky-400">World Context</h2>
      </div>
      <div className="flex-grow overflow-y-auto p-4">
        <Tabs tabs={tabs} />
      </div>
    </div>
  );
};
