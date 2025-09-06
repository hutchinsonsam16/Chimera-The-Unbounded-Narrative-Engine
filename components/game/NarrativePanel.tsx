import React, { useState, useRef, useEffect } from 'react';
import { useStore, useCanUndo, useCanRedo, useUndo, useRedo } from '../../hooks/useStore';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { StoryLogEntry } from '../../types';
import ReactMarkdown from 'react-markdown';

const LogEntry: React.FC<{ entry: StoryLogEntry }> = ({ entry }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(entry.content);
    const updateLogEntry = useStore(state => state.updateLogEntry);
    const regenerateFrom = useStore(state => state.regenerateFrom);
    const isLoading = useStore(state => state.gameState.isLoading);

    const handleSave = () => {
        updateLogEntry(entry.id, editedContent);
        setIsEditing(false);
    };

    const handleRegenerate = () => {
        if(isEditing) {
            updateLogEntry(entry.id, editedContent);
        }
        regenerateFrom(entry.id);
        setIsEditing(false);
    }

    switch (entry.type) {
      case 'player':
        return (
          <div className="group">
            {isEditing ? (
              <div className="border border-sky-500 rounded-md p-2">
                <Textarea value={editedContent} onChange={e => setEditedContent(e.target.value)} rows={2} className="text-sky-300 italic"/>
                <div className="flex justify-end space-x-2 mt-2">
                    <Button onClick={() => setIsEditing(false)} variant="secondary" size="sm">Cancel</Button>
                    <Button onClick={handleSave} size="sm">Save</Button>
                    <Button onClick={handleRegenerate} size="sm" disabled={isLoading}>Save & Regenerate</Button>
                </div>
              </div>
            ) : (
                <div className="flex justify-between items-start">
                    <p className="text-sky-300 italic flex-grow"> &gt; {entry.content}</p>
                    <Button onClick={() => setIsEditing(true)} variant="secondary" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity ml-4">Edit</Button>
                </div>
            )}
          </div>
        );
      case 'narrative':
        return <div className="text-gray-300 whitespace-pre-wrap prose prose-invert prose-sm max-w-none"><ReactMarkdown>{entry.content}</ReactMarkdown></div>;
      case 'image':
        return (
          <div className="my-2 p-2 bg-black/20 rounded-md">
            <p className="text-sm text-gray-400 italic mb-2">Image prompt: {entry.prompt}</p>
            {entry.content === 'generating...' ? (
              <div className="flex items-center justify-center h-48 bg-gray-700 rounded"><Spinner/></div>
            ) : entry.content === 'Image generation failed.' ? (
                <div className="flex items-center justify-center h-48 bg-gray-700 rounded text-red-400">{entry.content}</div>
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
}

export const NarrativePanel: React.FC = () => {
  const storyLog = useStore((state) => state.gameState.storyLog);
  const isLoading = useStore((state) => state.gameState.isLoading);
  const handlePlayerAction = useStore((state) => state.handlePlayerAction);
  const [playerInput, setPlayerInput] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const undo = useUndo();
  const redo = useRedo();

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [storyLog, storyLog.length, storyLog[storyLog.length-1]?.content]);

  const handleSubmit = () => {
    if (playerInput.trim() && !isLoading) {
      handlePlayerAction(playerInput.trim());
      setPlayerInput('');
    }
  };

  return (
    <div className="bg-gray-900 h-full flex flex-col p-4">
      <div className="flex-grow overflow-y-auto mb-4 pr-2 space-y-4">
        {storyLog.map(entry => (
          <div key={entry.id}><LogEntry entry={entry} /></div>
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
        <div className="absolute top-2 right-2 flex items-center space-x-2">
            <Button onClick={undo} disabled={!canUndo || isLoading} variant="secondary" size="sm">Undo</Button>
            <Button onClick={redo} disabled={!canRedo || isLoading} variant="secondary" size="sm">Redo</Button>
        </div>
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
