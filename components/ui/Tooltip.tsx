import React from 'react';

interface TooltipProps {
  children: React.ReactElement;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ children, text, position = 'top' }) => {
    const positionClasses = {
        top: 'bottom-full mb-2',
        bottom: 'top-full mt-2',
        left: 'right-full mr-2',
        right: 'left-full ml-2',
    };
  return (
    <div className="relative group flex items-center">
      {children}
      <div className={`absolute ${positionClasses[position]} w-max max-w-xs px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 shadow-lg`}>
        {text}
      </div>
    </div>
  );
};
