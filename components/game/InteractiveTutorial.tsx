import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { Button } from '../ui/Button';

type TutorialStep = {
    title: string;
    text: string;
    elementSelector: string;
};

const steps: TutorialStep[] = [
    {
        title: "Welcome to Chimera!",
        text: "This is the Character Panel. It holds all your character's stats, skills, and inventory.",
        elementSelector: 'div.flex-shrink-0.flex-grow-0.h-full.overflow-hidden:nth-child(1)'
    },
    {
        title: "The Narrative",
        text: "This is the heart of your story. Your actions and the AI's responses will appear here. Try typing in the box below!",
        elementSelector: 'div.flex-shrink-0.flex-grow-0.h-full.overflow-hidden:nth-child(3)'
    },
    {
        title: "World Context",
        text: "This panel contains information about the world, including NPCs, lore, and your timeline.",
        elementSelector: 'div.flex-shrink-0.flex-grow-0.h-full.overflow-hidden:nth-child(5)'
    },
    {
        title: "Application Controls",
        text: "Use these buttons to save your game, export your saga, or change settings.",
        elementSelector: 'header > div > div:nth-child(2)'
    },
    {
        title: "You're All Set!",
        text: "That's the basics. Your saga awaits. What will you do?",
        elementSelector: 'body'
    }
];

const Highlight: React.FC<{ element: Element }> = ({ element }) => {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${rect.left - 4}px`,
        top: `${rect.top - 4}px`,
        width: `${rect.width + 8}px`,
        height: `${rect.height + 8}px`,
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
        border: '2px solid var(--color-accent)',
        borderRadius: '4px',
        transition: 'all 0.3s ease-in-out',
        pointerEvents: 'none',
    };
    return <div style={style} />;
};


export const InteractiveTutorial: React.FC = () => {
    const [stepIndex, setStepIndex] = useState(0);
    const completeTutorial = useStore(state => state.completeTutorial);

    const currentStep = steps[stepIndex];
    const highlightedElement = document.querySelector(currentStep.elementSelector);

    const handleNext = () => {
        if (stepIndex < steps.length - 1) {
            setStepIndex(s => s + 1);
        } else {
            completeTutorial();
        }
    };
    
    const getTooltipPosition = () => {
        if (!highlightedElement) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        const rect = highlightedElement.getBoundingClientRect();
        return {
            top: `${rect.bottom + 10}px`,
            left: `${rect.left}px`,
        };
    };

    return (
        <div className="fixed inset-0 z-50">
            {highlightedElement && <Highlight element={highlightedElement} />}
            <div 
                className="absolute bg-[var(--color-primary)] p-4 rounded-lg shadow-2xl max-w-sm"
                style={getTooltipPosition()}
            >
                <h3 className="font-bold text-lg text-sky-400 mb-2">{currentStep.title}</h3>
                <p className="text-sm text-gray-300 mb-4">{currentStep.text}</p>
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{stepIndex + 1} / {steps.length}</span>
                    <div>
                        <Button variant="secondary" size="sm" onClick={completeTutorial} className="mr-2">Skip</Button>
                        <Button size="sm" onClick={handleNext}>
                            {stepIndex === steps.length - 1 ? 'Finish' : 'Next'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
