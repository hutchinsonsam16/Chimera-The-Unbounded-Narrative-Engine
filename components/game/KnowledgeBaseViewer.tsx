import React, { useState, useMemo } from 'react';
import { useStore } from '../../hooks/useStore';
import { Input } from '../ui/Input';
import { KnowledgeBaseEntry } from '../../types';

const EntryCard: React.FC<{ entry: KnowledgeBaseEntry }> = ({ entry }) => {
    return (
        <div className="p-3 bg-gray-800 rounded-lg shadow">
            <h4 className="font-bold text-sky-400 font-[var(--font-heading)]">{entry.name} <span className="text-xs font-normal text-gray-400 ml-2 capitalize">({entry.type})</span></h4>
            <div className="mt-2 text-sm space-y-1">
                {Object.entries(entry.fields).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                        <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className="text-gray-200">{value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const KnowledgeBaseViewer: React.FC = () => {
    const knowledgeBase = useStore(state => state.world.knowledgeBase);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    const entries = useMemo(() => Object.values(knowledgeBase), [knowledgeBase]);

    const filteredEntries = useMemo(() => {
        return entries.filter(entry => {
            const typeMatch = filterType === 'all' || entry.type === filterType;
            const searchMatch = searchTerm === '' || 
                entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                Object.values(entry.fields).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()));
            return typeMatch && searchMatch;
        });
    }, [entries, searchTerm, filterType]);

    const types = useMemo(() => ['all', ...Array.from(new Set(entries.map(e => e.type)))], [entries]);

    return (
        <div className="space-y-4">
            <div className="flex space-x-2">
                <Input 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    placeholder="Search knowledge base..."
                    className="flex-grow"
                />
                <select 
                    value={filterType} 
                    onChange={e => setFilterType(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-sky-500 focus:border-sky-500"
                >
                    {types.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {filteredEntries.length > 0 ? (
                    filteredEntries.map(entry => <EntryCard key={entry.id} entry={entry} />)
                ) : (
                    <p className="text-center text-gray-400 p-8 italic">No matching entries found.</p>
                )}
            </div>
        </div>
    );
};
