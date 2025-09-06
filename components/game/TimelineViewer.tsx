import React from 'react';
import { useStore } from '../../hooks/useStore';

export const TimelineViewer: React.FC = () => {
    const timeline = useStore(state => state.gameState.timeline);

    if (timeline.length === 0) {
        return <p className="p-4 text-sm text-gray-400 italic text-center">No key events have occurred yet.</p>
    }

    return (
        <div className="relative pl-6">
            {/* The vertical line */}
            <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-600"></div>
            
            <div className="space-y-6">
                {timeline.map((event, index) => (
                    <div key={event.id} className="relative">
                        {/* The circle on the line */}
                        <div className="absolute -left-[28px] top-1 w-4 h-4 bg-sky-500 rounded-full border-4 border-gray-800"></div>
                        <p className="text-sm text-gray-300">{event.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(event.timestamp).toLocaleString()}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
