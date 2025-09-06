import React, { useState, useRef, useCallback } from 'react';
import { useStore } from '../../hooks/useStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { generateOnboardingFromImage } from '../../services/geminiService';
import { toBase64 } from '../../lib/utils';
import { Spinner } from '../ui/Spinner';

const ImageDropzone: React.FC<{ onDetailsGenerated: (details: { name: string, backstory: string, openingPrompt: string, imageBase64: string }) => void }> = ({ onDetailsGenerated }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useStore();

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setIsLoading(true);
      try {
        const base64 = (await toBase64(file) as string).split(',')[1];
        const details = await generateOnboardingFromImage(base64);
        onDetailsGenerated({ ...details, imageBase64: base64 });
        addToast("Character details generated from image!", "success");
      } catch (error) {
        console.error("Failed to generate details from image:", error);
        addToast("Could not generate details from image.", "error");
      } finally {
        setIsLoading(false);
      }
    }
  }, [onDetailsGenerated, addToast]);

  return (
    <div 
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`mt-4 p-4 border-2 border-dashed rounded-lg text-center transition-colors duration-200 ${isDragging ? 'border-sky-400 bg-sky-900/20' : 'border-gray-600'}`}
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-24">
          <Spinner />
          <p className="mt-2 text-sm text-gray-400">Analyzing character...</p>
        </div>
      ) : (
        <p className="text-gray-400">...or drag and drop a character image here to auto-generate details.</p>
      )}
    </div>
  );
};


export const OnboardingWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [worldConcept, setWorldConcept] = useState('');
  const [charName, setCharName] = useState('');
  const [charBackstory, setCharBackstory] = useState('');
  const [openingPrompt, setOpeningPrompt] = useState('');
  const [charImageBase64, setCharImageBase64] = useState<string | null>(null);
  
  const startGame = useStore((state) => state.startGame);
  const loadGame = useStore((state) => state.loadGame);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);
  const handleStart = () => {
    if (worldConcept && charName && charBackstory && openingPrompt) {
      startGame(worldConcept, charName, charBackstory, openingPrompt, charImageBase64);
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

  const handleDetailsGenerated = (details: { name: string, backstory: string, openingPrompt: string, imageBase64: string }) => {
    setCharName(details.name);
    setCharBackstory(details.backstory);
    setOpeningPrompt(details.openingPrompt);
    setCharImageBase64(details.imageBase64);
  };


  return (
    <div className="flex-grow flex items-center justify-center bg-gray-900 p-8">
      <div className="w-full max-w-2xl bg-gray-800 p-8 rounded-lg shadow-2xl">
        <h1 className="text-3xl font-bold text-sky-400 mb-2 font-[var(--font-heading)]">Create Your Saga</h1>
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
               <ImageDropzone onDetailsGenerated={handleDetailsGenerated} />
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
