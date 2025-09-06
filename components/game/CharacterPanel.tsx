import React from 'react';
import { useStore } from '../../hooks/useStore';
import { Accordion } from '../ui/Accordion';
import { Button } from '../ui/Button';

const DataEntry: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <dt className="text-gray-400">{label}:</dt>
    <dd className="text-gray-200 text-right">{value}</dd>
  </div>
);

export const CharacterPanel: React.FC = () => {
  const character = useStore((state) => state.character);
  const visibility = useStore((state) => state.settings.componentVisibility.character);
  const exportCharacterSheet = useStore(state => state.exportCharacterSheet);

  return (
    <div className="bg-gray-800/50 h-full flex flex-col text-gray-200">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-sky-400 font-[var(--font-heading)]">{character.name || 'Unnamed Character'}</h2>
        <Button variant="secondary" size="sm" onClick={exportCharacterSheet}>Export Sheet</Button>
      </div>
      <div className="flex-grow overflow-y-auto">
        {visibility.portrait && (
            <div className="p-4">
              <img src={character.imageUrl} alt="Character Portrait" className="w-full h-auto object-cover rounded-md shadow-lg" />
            </div>
        )}
        
        {visibility.status && (
            <Accordion title="Status" isOpenDefault>
                <dl className="space-y-1 p-2">
                    {/* FIX: Cast value to string to resolve type error. */}
                    {Object.entries(character.status).map(([key, value]) => <DataEntry key={key} label={key} value={value as string} />)}
                </dl>
            </Accordion>
        )}
        
        {visibility.skills && (
             <Accordion title="Skills" isOpenDefault>
                <dl className="space-y-1 p-2">
                    {/* FIX: Cast value to string to resolve type error. */}
                    {Object.keys(character.skills).length > 0 ? Object.entries(character.skills).map(([key, value]) => <DataEntry key={key} label={key} value={value as string} />) : <p className="text-xs text-gray-400 italic p-2">No skills yet.</p>}
                </dl>
            </Accordion>
        )}
        
        {visibility.inventory && (
            <Accordion title="Inventory" isOpenDefault>
                {character.inventory.length > 0 ? (
                    <ul className="list-disc list-inside p-2 text-sm space-y-1">
                        {character.inventory.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                ) : <p className="text-xs text-gray-400 italic p-2">Inventory is empty.</p>}
            </Accordion>
        )}
        
        {visibility.backstory && (
             <Accordion title="Backstory">
                <p className="text-sm p-2 text-gray-300 whitespace-pre-wrap">{character.backstory}</p>
            </Accordion>
        )}
      </div>
    </div>
  );
};