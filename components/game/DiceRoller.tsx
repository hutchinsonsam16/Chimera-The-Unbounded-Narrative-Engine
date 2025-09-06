import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../hooks/useStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface RollResult {
    notation: string;
    rolls: number[];
    modifier: number;
    total: number;
}

export const DiceRoller: React.FC = () => {
    const toggleDiceRoller = useStore(state => state.toggleDiceRoller);
    const [notation, setNotation] = useState('1d20');
    const [history, setHistory] = useState<RollResult[]>([]);
    const [position, setPosition] = useState({ x: window.innerWidth - 350, y: 50 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const rollerRef = useRef<HTMLDivElement>(null);

    const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!rollerRef.current) return;
        setIsDragging(true);
        const rect = rollerRef.current.getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragOffset.current.x,
            y: e.clientY - dragOffset.current.y,
        });
    };

    const onMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging]);

    const handleRoll = () => {
        const regex = /^(\d+)d(\d+)([+-]\d+)?$/i;
        const match = notation.match(regex);
        if (!match) {
            // Handle invalid notation
            return;
        }

        const [, numDiceStr, sidesStr, modifierStr] = match;
        const numDice = parseInt(numDiceStr, 10);
        const sides = parseInt(sidesStr, 10);
        const modifier = modifierStr ? parseInt(modifierStr, 10) : 0;

        const rolls: number[] = [];
        let sum = 0;
        for (let i = 0; i < numDice; i++) {
            const roll = Math.floor(Math.random() * sides) + 1;
            rolls.push(roll);
            sum += roll;
        }

        const total = sum + modifier;
        const newResult = { notation, rolls, modifier, total };
        setHistory([newResult, ...history.slice(0, 4)]);
    };

    return (
        <div
            ref={rollerRef}
            className="fixed z-40 bg-gray-800 shadow-2xl rounded-lg p-4 w-72"
            style={{ top: position.y, left: position.x }}
        >
            <div className="flex justify-between items-center cursor-move" onMouseDown={onMouseDown}>
                <h3 className="font-bold text-sky-400">Dice Roller</h3>
                <button onClick={toggleDiceRoller} className="text-gray-400 hover:text-white">&times;</button>
            </div>
            <div className="mt-4 flex space-x-2">
                <Input
                    value={notation}
                    onChange={(e) => setNotation(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRoll()}
                    placeholder="e.g., 2d6+3"
                />
                <Button onClick={handleRoll}>Roll</Button>
            </div>
            <div className="mt-4 space-y-2 text-sm max-h-48 overflow-y-auto">
                {history.map((result, index) => (
                    <div key={index} className="p-2 bg-gray-900 rounded">
                        <div className="flex justify-between items-baseline">
                            <span className="text-gray-400">{result.notation}</span>
                            <span className="text-xl font-bold text-sky-300">{result.total}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            Rolls: [{result.rolls.join(', ')}]
                            {result.modifier !== 0 && ` | Modifier: ${result.modifier > 0 ? '+' : ''}${result.modifier}`}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};
