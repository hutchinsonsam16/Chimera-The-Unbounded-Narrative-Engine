import React, { useState, useRef, useEffect } from 'react';
import { useStore, useCanUndo, useCanRedo, useUndo, useRedo } from '../../hooks/useStore';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { StoryLogEntry } from '../../types';
import ReactMarkdown from 'react-markdown';
import { Tooltip } from '../ui/Tooltip';

const LogEntry: React.FC<{ entry: StoryLogEntry }> = ({ entry }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(entry.content);
    const updateLogEntry = useStore(state => state.updateLogEntry);
    const regenerateFrom = useStore(state => state.regenerateFrom);
    const toggleImageEditor = useStore(state => state.toggleImageEditor);
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
          <div className="group ml-auto w-fit max-w-[80%] my-2">
            {isEditing ? (
              <div className="border border-sky-500 rounded-md p-2 bg-gray-800">
                <Textarea value={editedContent} onChange={e => setEditedContent(e.target.value)} rows={2} className="text-sky-300 italic"/>
                <div className="flex justify-end space-x-2 mt-2">
                    <Button onClick={() => setIsEditing(false)} variant="secondary" size="sm">Cancel</Button>
                    <Button onClick={handleSave} size="sm">Save</Button>
                    <Button onClick={handleRegenerate} size="sm" disabled={isLoading}>Save & Regenerate</Button>
                </div>
              </div>
            ) : (
                <div className="flex justify-end items-start bg-sky-900/50 rounded-lg rounded-br-none p-3 shadow">
                    <p className="text-sky-200 italic flex-grow text-right">{entry.content}</p>
                    <Button onClick={() => setIsEditing(true)} variant="secondary" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity ml-4 flex-shrink-0">Edit</Button>
                </div>
            )}
          </div>
        );
      case 'narrative':
        return <div className="text-gray-300 whitespace-pre-wrap prose prose-invert prose-sm max-w-none leading-relaxed my-2"><ReactMarkdown>{entry.content}</ReactMarkdown></div>;
      case 'image':
        return (
          <div className="my-4 p-3 bg-black/20 rounded-lg shadow-md flex flex-col items-center group relative">
            <p className="text-sm text-gray-400 italic mb-2 self-start">Image prompt: {entry.prompt}</p>
            {entry.content === 'generating...' ? (
              <div className="flex items-center justify-center h-48 w-full bg-gray-700 rounded"><Spinner/></div>
            ) : entry.content.includes('failed') ? (
                <div className="flex items-center justify-center h-48 w-full bg-gray-700 rounded text-red-400">{entry.content}</div>
            ) : (
              <img src={entry.content} alt={entry.prompt} className="rounded max-w-md w-full" />
            )}
             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="secondary" size="sm" onClick={() => toggleImageEditor(entry.id)}>Edit Image</Button>
            </div>
          </div>
        );
      case 'system':
         return <p className="text-xs text-center text-gray-500 py-3 my-2 border-t border-b border-gray-700/50">--- {entry.content} ---</p>;
      default:
        return null;
    }
}

export const NarrativePanel: React.FC = () => {
  const { storyLog, isLoading, handlePlayerAction, createSnapshot, settings, setSettings, suggestPlayerAction } = useStore(state => ({
    storyLog: state.gameState.storyLog,
    isLoading: state.gameState.isLoading,
    handlePlayerAction: state.handlePlayerAction,
    createSnapshot: state.createSnapshot,
    settings: state.settings,
    setSettings: state.setSettings,
    suggestPlayerAction: state.suggestPlayerAction,
  }));
  const [playerInput, setPlayerInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const undo = useUndo();
  const redo = useRedo();

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [storyLog[storyLog.length - 1]?.id]);

  const handleSubmit = () => {
    if (playerInput.trim() && !isLoading) {
      handlePlayerAction(playerInput.trim());
      setPlayerInput('');
      setSuggestions([]);
    }
  };

  const handleSnapshot = () => {
    const name = prompt("Enter a name for this story snapshot:", `Branch ${new Date().toLocaleTimeString()}`);
    if (name) {
      createSnapshot(name);
    }
  };

  const handleSuggestion = async () => {
      setSuggestions([]);
      const newSuggestions = await suggestPlayerAction();
      setSuggestions(newSuggestions);
  };
  
  const handlePromptAssistToggle = () => {
      setSettings({ ...settings, gameplay: { ...settings.gameplay, promptAssist: !settings.gameplay.promptAssist }});
  }

  return (
    <div className="bg-gray-900 h-full flex flex-col p-4">
      <div className="flex-grow overflow-y-auto mb-4 pr-2 space-y-2">
        {storyLog.map(entry => (
          <div key={entry.id}><LogEntry entry={entry} /></div>
        ))}
        {suggestions.length > 0 && (
            <div className="p-2 bg-gray-800/50 rounded-md">
                <h4 className="text-xs text-sky-400 mb-2 font-semibold">Suggestions:</h4>
                <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                        <Button key={i} size="sm" variant="secondary" onClick={() => setPlayerInput(s)}>{s}</Button>
                    ))}
                </div>
            </div>
        )}
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
            <Tooltip text="Create a savable branch of the story from this point.">
                <Button onClick={handleSnapshot} disabled={isLoading} variant="secondary" size="sm">Snapshot</Button>
            </Tooltip>
            <Tooltip text="Undo last story change (Ctrl+Z)">
                <Button onClick={() => undo()} disabled={!canUndo || isLoading} variant="secondary" size="sm">Undo</Button>
            </Tooltip>
             <Tooltip text="Redo last story change (Ctrl+Y)">
                <Button onClick={() => redo()} disabled={!canRedo || isLoading} variant="secondary" size="sm">Redo</Button>
            </Tooltip>
        </div>
        <div className="absolute bottom-2 left-2 flex items-center space-x-2">
             <Tooltip text="Ask the AI to suggest actions for your character.">
                <Button onClick={handleSuggestion} disabled={isLoading} variant="secondary" size="sm">Suggest Action</Button>
            </Tooltip>
             <Tooltip text="When enabled, the AI will rephrase your input into a more literary prompt before generating the story. (Cloud AI only)">
                <label className="flex items-center space-x-2 cursor-pointer text-xs text-gray-400">
                    <input type="checkbox" checked={settings.gameplay.promptAssist} onChange={handlePromptAssistToggle} className="rounded bg-gray-700 border-gray-600 text-sky-500 focus:ring-sky-600"/>
                    <span>Prompt Assist</span>
                </label>
            </Tooltip>
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