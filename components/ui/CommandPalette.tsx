import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../../hooks/useStore';

type Command = {
    id: string;
    name: string;
    section: string;
    action: () => void;
    keywords?: string;
};

export const CommandPalette: React.FC = () => {
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const {
        toggleCommandPalette,
        toggleSettings,
        saveGame,
        toggleExportModal,
        toggleDiceRoller,
        toggleAudioPlayer,
        restartGame,
        exportCharacterSheet,
    } = useStore(state => ({
        toggleCommandPalette: state.toggleCommandPalette,
        toggleSettings: state.toggleSettings,
        saveGame: state.saveGame,
        // FIX: Replaced `exportGame` with `toggleExportModal` to match the expected action type and UI flow.
        toggleExportModal: state.toggleExportModal,
        toggleDiceRoller: state.toggleDiceRoller,
        toggleAudioPlayer: state.toggleAudioPlayer,
        restartGame: state.restartGame,
        exportCharacterSheet: state.exportCharacterSheet,
    }));

    const allCommands: Command[] = useMemo(() => [
        { id: 'settings', name: 'Toggle Settings', section: 'General', action: toggleSettings },
        { id: 'dice', name: 'Toggle Dice Roller', section: 'General', action: toggleDiceRoller },
        { id: 'audio', name: 'Toggle Audio Player', section: 'General', action: toggleAudioPlayer },
        { id: 'save', name: 'Save Game', section: 'Game', action: saveGame, keywords: 'save' },
        // FIX: Changed action to `toggleExportModal` which has the correct `() => void` signature.
        { id: 'export', name: 'Export Saga', section: 'Game', action: toggleExportModal, keywords: 'zip archive' },
        { id: 'sheet', name: 'Export Character Sheet', section: 'Game', action: exportCharacterSheet, keywords: 'pdf' },
        { id: 'restart', name: 'Restart Game', section: 'Game', action: () => { if (window.confirm("Are you sure?")) restartGame(); }, keywords: 'new danger' },
    ], []);


    const filteredCommands = useMemo(() => {
        if (!search) return allCommands;
        const lowerSearch = search.toLowerCase();
        return allCommands.filter(cmd => 
            cmd.name.toLowerCase().includes(lowerSearch) || 
            cmd.section.toLowerCase().includes(lowerSearch) ||
            cmd.keywords?.toLowerCase().includes(lowerSearch)
        );
    }, [search, allCommands]);
    
    useEffect(() => {
        inputRef.current?.focus();
    }, []);
    
    useEffect(() => {
        setSelectedIndex(0);
    }, [search]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => (i + 1) % filteredCommands.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const command = filteredCommands[selectedIndex];
                if (command) {
                    command.action();
                    toggleCommandPalette();
                }
            } else if (e.key === 'Escape') {
                toggleCommandPalette();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredCommands, selectedIndex, toggleCommandPalette]);
    
    const commandGroups = useMemo(() => {
        return filteredCommands.reduce((acc, cmd) => {
            (acc[cmd.section] = acc[cmd.section] || []).push(cmd);
            return acc;
        }, {} as Record<string, Command[]>);
    }, [filteredCommands]);

    let currentIndex = -1;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-start pt-20" onClick={toggleCommandPalette}>
            <div className="w-full max-w-lg bg-gray-800 rounded-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Type a command or search..."
                    className="w-full bg-transparent p-4 text-lg text-white placeholder-gray-400 focus:outline-none border-b border-gray-700"
                />
                <div className="max-h-96 overflow-y-auto p-2">
                    {Object.entries(commandGroups).map(([section, commands]) => (
                        <div key={section}>
                            <h3 className="text-xs font-semibold text-gray-400 px-2 mt-2 uppercase">{section}</h3>
                            <ul className="mt-1">
                                {commands.map(cmd => {
                                    currentIndex++;
                                    const isSelected = currentIndex === selectedIndex;
                                    return (
                                        <li 
                                            key={cmd.id}
                                            onClick={() => { cmd.action(); toggleCommandPalette(); }}
                                            className={`p-2 rounded-md cursor-pointer flex justify-between items-center ${isSelected ? 'bg-sky-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                                        >
                                            {cmd.name}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                    {filteredCommands.length === 0 && <p className="text-center text-gray-400 p-4">No results found.</p>}
                </div>
            </div>
        </div>
    );
};