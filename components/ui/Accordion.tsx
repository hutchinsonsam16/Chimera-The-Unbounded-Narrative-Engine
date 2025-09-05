
import React, { useState } from 'react';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  isOpenDefault?: boolean;
}

export const Accordion: React.FC<AccordionProps> = ({ title, children, isOpenDefault = false }) => {
  const [isOpen, setIsOpen] = useState(isOpenDefault);

  return (
    <div className="border-b border-gray-700">
      <h2>
        <button
          type="button"
          className="flex items-center justify-between w-full p-3 font-medium text-left text-gray-300 hover:bg-gray-800"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>{title}</span>
          <svg
            className={`w-3 h-3 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
      </h2>
      {isOpen && (
        <div className="p-3 bg-gray-900/50">
          {children}
        </div>
      )}
    </div>
  );
};
