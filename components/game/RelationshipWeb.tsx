import React from 'react';
import { useStore } from '../../hooks/useStore';

export const RelationshipWeb: React.FC = () => {
  const { npcs, name: playerName } = useStore(state => ({
    npcs: state.world.npcs,
    name: state.character.name,
  }));
  
  const width = 400;
  const height = 300;
  const center = { x: width / 2, y: height / 2 };
  const radius = Math.min(width, height) / 2 - 40;

  const relationshipColors: { [key: string]: string } = {
      'Friendly': '#22c55e', // green-500
      'Hostile': '#ef4444', // red-500
      'Neutral': '#6b7280', // gray-500
      'Allied': '#38bdf8', // sky-400
      'Enemy': '#f97316', // orange-500
      'default': '#a1a1aa' // zinc-400
  };

  if (npcs.length === 0) {
      return (
          <div className="p-4 bg-gray-900 rounded-md text-center text-gray-400">
            <h3 className="font-semibold text-lg mb-2">Relationship Web</h3>
            <p className="text-sm">No NPCs introduced yet. As you meet characters, their relationships will appear here.</p>
          </div>
      );
  }

  return (
    <div className="p-4 bg-gray-900 rounded-md text-gray-400">
      <h3 className="font-semibold text-lg mb-2 text-center">Relationship Web</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Player Node */}
        <circle cx={center.x} cy={center.y} r="20" fill="#38bdf8" />
        <text x={center.x} y={center.y + 35} textAnchor="middle" fill="#f3f4f6" fontSize="12">{playerName}</text>
        
        {npcs.map((npc, index) => {
            const angle = (index / npcs.length) * 2 * Math.PI;
            const x = center.x + radius * Math.cos(angle);
            const y = center.y + radius * Math.sin(angle);
            const color = relationshipColors[npc.relationship] || relationshipColors.default;

            return (
                <g key={npc.id}>
                    {/* Line */}
                    <line x1={center.x} y1={center.y} x2={x} y2={y} stroke={color} strokeWidth="2" />
                    {/* NPC Node */}
                    <circle cx={x} cy={y} r="15" fill="#374151" stroke={color} strokeWidth="2" />
                    <text x={x} y={y + 28} textAnchor="middle" fill="#f3f4f6" fontSize="10">{npc.name}</text>
                </g>
            );
        })}
      </svg>
    </div>
  );
};
