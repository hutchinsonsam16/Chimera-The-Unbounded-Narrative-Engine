
import React, { useState, useRef } from 'react';
import { useStore } from '../../hooks/useStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

export const OnboardingWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [worldConcept, setWorldConcept] = useState('');
  const [charName, setCharName] = useState('');
  const [charBackstory, setCharBackstory] = useState('');
  const [openingPrompt, setOpeningPrompt] = useState('');
  
  const startGame = useStore((state) => state.startGame);
  const loadGame = useStore((state) => state.loadGame);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);
  const handleStart = () => {
    if (worldConcept && charName && charBackstory && openingPrompt) {
      startGame(worldConcept, charName, charBackstory, openingPrompt);
    }
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      loadGame(file);
    }
  };


  return (
    <div className="flex-grow flex items-center justify-center bg-gray-900 p-8">
      <div className="w-full max-w-2xl bg-gray-800 p-8 rounded-lg shadow-2xl">
        <h1 className="text-3xl font-bold text-sky-400 mb-2">Create Your Saga</h1>
        <p className="text-gray-400 mb-6">Forge a new world and step into your character's shoes.</p>
        
        <div className="space-y-6">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Step 1: The World</h2>
              <Textarea
                label="Describe the world concept, its key themes, and tone."
                value={worldConcept}
                onChange={(e) => setWorldConcept(e.target.value)}
                rows={5}
                placeholder="e.g., A cyberpunk city ruled by AI, shrouded in perpetual rain and neon light..."
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Step 2: The Character</h2>
              <Input
                label="Character Name"
                value={charName}
                onChange={(e) => setCharName(e.target.value)}
                placeholder="e.g., Kaelen, the rogue hacker"
              />
              <Textarea
                label="Character Backstory"
                value={charBackstory}
                onChange={(e) => setCharBackstory(e.target.value)}
                rows={4}
                className="mt-4"
                placeholder="e.g., An ex-corporate enforcer, betrayed and left for dead..."
              />
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Step 3: The Opening Scene</h2>
              <Textarea
                label="Write the opening prompt for your story. What is your character doing?"
                value={openingPrompt}
                onChange={(e) => setOpeningPrompt(e.target.value)}
                rows={5}
                placeholder="e.g., I wake up in a grimy alley, the taste of synthetic chrome in my mouth. I check my pockets."
              />
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-between items-center">
            <div>
                <Button variant="secondary" onClick={handleLoadClick}>Load Game</Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json"/>
            </div>
            <div className="space-x-4">
                {step > 1 && <Button variant="secondary" onClick={handleBack}>Back</Button>}
                {step < 3 && <Button onClick={handleNext} disabled={!worldConcept || (step === 2 && !charName)}>Next</Button>}
                {step === 3 && <Button onClick={handleStart} disabled={!openingPrompt}>Begin Saga</Button>}
            </div>
        </div>
      </div>
    </div>
  );
};
