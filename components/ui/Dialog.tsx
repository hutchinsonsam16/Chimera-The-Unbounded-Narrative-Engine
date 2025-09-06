import React from 'react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
    >
      <div 
        className="bg-[var(--color-primary)] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-[var(--color-secondary)]">
          <h2 id="dialog-title" className="text-xl font-bold text-[var(--color-text)] font-[var(--font-heading)]">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white text-2xl leading-none"
            aria-label="Close dialog"
          >&times;</button>
        </div>
        <div className="p-6 overflow-y-auto text-[var(--color-text)]">
          {children}
        </div>
        {footer && (
            <div className="p-4 border-t border-[var(--color-secondary)]">
                {footer}
            </div>
        )}
      </div>
    </div>
  );
};
