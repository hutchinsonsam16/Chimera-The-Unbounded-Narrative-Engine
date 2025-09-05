
import React, { useState, useRef } from 'react';
import { useStore } from '../../hooks/useStore';
import type { PanelType } from '../../types';

export const PanelOrderManager: React.FC = () => {
  const initialOrder = useStore((state) => state.settings.layout.panelOrder);
  const setPanelOrder = useStore((state) => state.setPanelOrder);
  
  const [order, setOrder] = useState(initialOrder);
  const draggedItem = useRef<PanelType | null>(null);
  const draggedOverItem = useRef<PanelType | null>(null);

  const handleDragStart = (item: PanelType) => {
    draggedItem.current = item;
  };

  const handleDragEnter = (item: PanelType) => {
    draggedOverItem.current = item;
  };

  const handleDragEnd = () => {
    if (draggedItem.current && draggedOverItem.current) {
      const newOrder = [...order];
      const draggedItemIndex = newOrder.indexOf(draggedItem.current);
      const draggedOverItemIndex = newOrder.indexOf(draggedOverItem.current);

      // Swap items
      [newOrder[draggedItemIndex], newOrder[draggedOverItemIndex]] = [newOrder[draggedOverItemIndex], newOrder[draggedItemIndex]];
      
      setOrder(newOrder);
      setPanelOrder(newOrder);
    }
    draggedItem.current = null;
    draggedOverItem.current = null;
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div>
        <h4 className="text-md font-semibold text-gray-200 mb-2">Panel Order</h4>
        <p className="text-sm text-gray-400 mb-3">Drag and drop to reorder the main UI panels.</p>
        <div className="flex space-x-4">
        {order.map((panel) => (
            <div
            key={panel}
            draggable
            onDragStart={() => handleDragStart(panel)}
            onDragEnter={() => handleDragEnter(panel)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className="p-4 bg-gray-600 rounded-md cursor-grab text-center text-white font-semibold flex-1"
            >
            {capitalize(panel)}
            </div>
        ))}
        </div>
    </div>
  );
};
