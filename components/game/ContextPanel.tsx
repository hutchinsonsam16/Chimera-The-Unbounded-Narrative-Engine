import React from 'react';
import { useStore } from '../../hooks/useStore';
import { Tabs } from '../ui/Tabs';
import { RelationshipWeb } from './RelationshipWeb';
import { InteractiveMap } from './InteractiveMap';
import { KnowledgeBaseViewer } from './KnowledgeBaseViewer';
import { TimelineViewer } from './TimelineViewer';
import { SnapshotsManager } from './SnapshotsManager';

const NpcsTab: React.FC = () => {
    const npcs = useStore(state => state.world.npcs);
    if (npcs.length === 0) {
        return <p className="p-4 text-sm text-gray-400 italic">No NPCs have been introduced yet.</p>
    }
    return (
        <div className="space-y-4 p-2">
            {npcs.map(npc => (
                <div key={npc.id} className="p-3 bg-gray-800 rounded-lg shadow flex space-x-4 items-start">
                    {npc.imageUrl && <img src={npc.imageUrl} alt={npc.name} className="w-16 h-16 rounded object-cover flex-shrink-0" />}
                    <div className="flex-grow">
                        <h4 className="font-bold text-sky-400 font-[var(--font-heading)]">{npc.name}</h4>
                        <p className="text-xs text-gray-400">Relationship: <span className="font-semibold">{npc.relationship}</span></p>
                        <p className="text-sm mt-1 text-gray-300">{npc.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};


export const ContextPanel: React.FC = () => {
  const visibility = useStore((state) => state.settings.componentVisibility.context);
  
  const tabs = [
      { label: 'Knowledge Base', content: <KnowledgeBaseViewer /> },
      { label: 'Timeline', content: <TimelineViewer /> },
      { label: 'Branches', content: <SnapshotsManager /> },
  ];
  if (visibility.npcs) tabs.push({ label: 'NPCs', content: <NpcsTab /> });
  if (visibility.relationshipWeb) tabs.push({ label: 'Relationship Web', content: <RelationshipWeb /> });
  if (visibility.map) tabs.push({ label: 'Interactive Map', content: <InteractiveMap /> });

  return (
    <div className="bg-gray-800/50 h-full flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-2xl font-bold text-sky-400 font-[var(--font-heading)]">World Context</h2>
      </div>
      <div className="flex-grow overflow-y-auto p-4">
        {tabs.length > 0 ? <Tabs tabs={tabs} /> : <p className="text-center text-gray-400 p-8">Context components are hidden in settings.</p>}
      </div>
    </div>
  );
};
