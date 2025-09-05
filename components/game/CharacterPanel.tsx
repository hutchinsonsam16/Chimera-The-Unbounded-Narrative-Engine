
import React from 'react';
import { useStore } from '../../hooks/useStore';
import { Accordion } from '../ui/Accordion';

const DataEntry: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <dt className="text-gray-400">{label}:</dt>
    <dd className="text-gray-200">{value}</dd>
  </div>
);

export const CharacterPanel: React.FC = () => {
  const character = useStore((state) => state.character);
  const visibility = useStore((state) => state.settings.componentVisibility.character);

  return (
    <div className="bg-gray-800/50 h-full flex flex-col text-gray-200">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-2xl font-bold text-sky-400">{character.name || 'Unnamed Character'}</h2>
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
                    {Object.entries(character.status).map(([key, value]) => <DataEntry key={key} label={key} value={value} />)}
                </dl>
            </Accordion>
        )}
        
        {visibility.skills && (
             <Accordion title="Skills" isOpenDefault>
                <dl className="space-y-1 p-2">
                    {Object.entries(character.skills).map(([key, value]) => <DataEntry key={key} label={key} value={value} />)}
                </dl>
            </Accordion>
        )}
        
        {visibility.inventory && (
            <Accordion title="Inventory" isOpenDefault>
                <ul className="list-disc list-inside p-2 text-sm space-y-1">
                    {character.inventory.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
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
