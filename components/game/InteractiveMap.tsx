import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../hooks/useStore';

interface Location {
    name: string;
    x: number;
    y: number;
}

// A simple pseudo-random number generator for consistent location placement
const pseudoRandom = (seed: number) => {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

export const InteractiveMap: React.FC = () => {
    const lore = useStore(state => state.world.lore);
    const [viewBox, setViewBox] = useState({ x: -250, y: -250, width: 500, height: 500 });
    const [isPanning, setIsPanning] = useState(false);
    const lastPoint = useRef({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);

    const locations: Location[] = React.useMemo(() => {
        const found = new Set<string>();
        const locationRegex = /\[Location:\s*([^\]]+)\]/g;
        let match;
        const result: Location[] = [];
        let index = 0;
        while ((match = locationRegex.exec(lore)) !== null) {
            const name = match[1].trim();
            if (!found.has(name.toLowerCase())) {
                 found.add(name.toLowerCase());
                 const seed = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                 result.push({
                    name,
                    x: (pseudoRandom(seed) - 0.5) * 400,
                    y: (pseudoRandom(seed * 2) - 0.5) * 400,
                 });
                 index++;
            }
        }
        return result;
    }, [lore]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsPanning(true);
        lastPoint.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning || !svgRef.current) return;
        const point = { x: e.clientX, y: e.clientY };
        const delta = { x: point.x - lastPoint.current.x, y: point.y - lastPoint.current.y };
        lastPoint.current = point;
        
        const svgSize = svgRef.current.getBoundingClientRect();
        const scale = viewBox.width / svgSize.width;

        setViewBox(prev => ({
            ...prev,
            x: prev.x - delta.x * scale,
            y: prev.y - delta.y * scale,
        }));
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const newWidth = e.deltaY > 0 ? viewBox.width * zoomFactor : viewBox.width / zoomFactor;
        const newHeight = e.deltaY > 0 ? viewBox.height * zoomFactor : viewBox.height / zoomFactor;
        const dx = (newWidth - viewBox.width) / 2;
        const dy = (newHeight - viewBox.height) / 2;

        setViewBox(prev => ({
            width: newWidth,
            height: newHeight,
            x: prev.x - dx,
            y: prev.y - dy,
        }));
    };

  return (
    <div className="p-4 bg-gray-900 rounded-md text-center text-gray-400 h-[400px] flex flex-col">
      <h3 className="font-semibold text-lg mb-2">Interactive Map</h3>
      <div className="flex-grow w-full h-full bg-gray-800 rounded-md overflow-hidden cursor-move">
         <svg 
            ref={svgRef}
            className="w-full h-full"
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
         >
            <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="transparent" />
            <circle cx="0" cy="0" r="5" fill="#38bdf8">
                 <title>Starting Point</title>
            </circle>

            {locations.map(loc => (
                <g key={loc.name}>
                    <circle cx={loc.x} cy={loc.y} r="4" fill="#f97316">
                         <title>{loc.name}</title>
                    </circle>
                    <text x={loc.x + 8} y={loc.y + 4} fill="#f3f4f6" fontSize={Math.min(10, viewBox.width/40)}>{loc.name}</text>
                </g>
            ))}
         </svg>
      </div>
    </div>
  );
};
