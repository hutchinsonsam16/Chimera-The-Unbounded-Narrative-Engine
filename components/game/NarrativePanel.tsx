
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../hooks/useStore';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

export const NarrativePanel: React.FC = () => {
  const storyLog = useStore((state) => state.gameState.storyLog);
  const isLoading = useStore((state) => state.gameState.isLoading);
  const handlePlayerAction = useStore((state) => state.handlePlayerAction);
  const [playerInput, setPlayerInput] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [storyLog]);

  const handleSubmit = () => {
    if (playerInput.trim() && !isLoading) {
      handlePlayerAction(playerInput.trim());
      setPlayerInput('');
    }
  };

  const renderEntry = (entry: typeof storyLog[0]) => {
    switch (entry.type) {
      case 'player':
        return <p className="text-sky-300 italic"> &gt; {entry.content}</p>;
      case 'narrative':
        return <p className="text-gray-300 whitespace-pre-wrap">{entry.content}</p>;
      case 'image':
        return (
          <div className="my-2 p-2 bg-black/20 rounded-md">
            <p className="text-sm text-gray-400 italic mb-2">Image prompt: {entry.prompt}</p>
            {entry.content === 'generating...' ? (
              <div className="flex items-center justify-center h-48 bg-gray-700 rounded"><Spinner/></div>
            ) : (
              <img src={entry.content} alt={entry.prompt} className="rounded max-w-sm mx-auto" />
            )}
          </div>
        );
      case 'system':
         return <p className="text-xs text-center text-gray-500 py-2">--- {entry.content} ---</p>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-900 h-full flex flex-col p-4">
      <div className="flex-grow overflow-y-auto mb-4 pr-2 space-y-4">
        {storyLog.map(entry => (
          <div key={entry.id}>{renderEntry(entry)}</div>
        ))}
        <div ref={logEndRef} />
      </div>
      <div className="flex-shrink-0 relative">
        <Textarea
          value={playerInput}
          onChange={(e) => setPlayerInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="What do you do next?"
          rows={3}
          disabled={isLoading}
          className="pr-24"
        />
        <div className="absolute bottom-2 right-2 flex items-center space-x-2">
            {isLoading && <Spinner/>}
            <Button onClick={handleSubmit} disabled={isLoading || !playerInput.trim()}>
                Send
            </Button>
        </div>
      </div>
    </div>
  );
};
