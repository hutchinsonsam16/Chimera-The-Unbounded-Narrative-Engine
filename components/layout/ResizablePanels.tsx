
import React, { useState, useRef, useCallback, ReactNode } from 'react';
import { useStore } from '../../hooks/useStore';

interface ResizablePanelsProps {
  children: ReactNode[];
}

export const ResizablePanels: React.FC<ResizablePanelsProps> = ({ children }) => {
  const initialSizes = useStore(state => state.settings.layout.panelSizes);
  const setSizes = useStore(state => state.setPanelSizes);
  const [sizes, setLocalSizes] = useState(initialSizes);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (index: number) => {
    setIsDragging(true);
    setDraggingIndex(index);
  };

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDraggingIndex(-1);
      setSizes(sizes);
    }
  }, [isDragging, setSizes, sizes]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const clientX = e.clientX - containerRef.current.getBoundingClientRect().left;

    const newSizes = [...sizes];
    const delta = (clientX / containerWidth) * 100 - newSizes.slice(0, draggingIndex + 1).reduce((a, b) => a + b, 0);
    
    // Naive implementation for 3 panels
    if (newSizes.length === 3) {
      const minSize = 10; // 10% minimum size
      
      let newLeftSize = newSizes[draggingIndex] + delta;
      let newRightSize = newSizes[draggingIndex + 1] - delta;

      if (newLeftSize < minSize) {
        newLeftSize = minSize;
        newRightSize = newSizes[draggingIndex] + newSizes[draggingIndex+1] - minSize;
      }
      if (newRightSize < minSize) {
        newRightSize = minSize;
        newLeftSize = newSizes[draggingIndex] + newSizes[draggingIndex+1] - minSize;
      }
      
      newSizes[draggingIndex] = newLeftSize;
      newSizes[draggingIndex + 1] = newRightSize;
      
      setLocalSizes(newSizes);
    }

  }, [isDragging, draggingIndex, sizes]);

  React.useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);


  return (
    <div ref={containerRef} className="flex flex-row h-full w-full">
      {children.map((child, index) => (
        <React.Fragment key={index}>
          <div style={{ flexBasis: `${sizes[index]}%` }} className="flex-shrink-0 flex-grow-0 h-full overflow-hidden">
            {child}
          </div>
          {index < children.length - 1 && (
            <div
              onMouseDown={() => handleMouseDown(index)}
              className="w-2 h-full bg-gray-900 hover:bg-sky-500 cursor-col-resize flex-shrink-0 transition-colors"
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
